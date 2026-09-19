/**
 * @jest-environment jsdom
 */
import { CatanMCTSBot, CATAN_MCTS_EVALUATOR_WEIGHTS } from './CatanMCTSBot';
import { createMockGameState, createTestPlayer } from '../game/testUtils';
import { RollStatus, TerrainType } from '../game/core/types';
import { PHASES, STAGES, GameStage } from '../game/core/constants';
import { generateBoard } from '../game/generation/boardGen';
import { UctSelectionPolicy } from '../game/ai/search/UctSelectionPolicy';

function createSetupState(currentPlayer = '0') {
  const { hexes, ports } = generateBoard();
  const desertHex = Object.values(hexes).find((h) => h.terrain === TerrainType.Desert);
  const game = createMockGameState({
    board: { hexes, ports, vertices: {}, edges: {} },
    players: {
      '0': createTestPlayer('0', { victoryPoints: 0 }),
      '1': createTestPlayer('1', { victoryPoints: 0 }),
    },
    robberLocation: desertHex?.id || '0',
    setupPhase: { activeRound: 1 },
    setupOrder: ['0', '1', '1', '0'],
  });

  const ctx: any = {
    currentPlayer,
    turn: 1,
    phase: PHASES.SETUP,
    activePlayers: { [currentPlayer]: STAGES.PLACE_SETTLEMENT },
    numPlayers: 2,
    gameover: null,
  };

  return { game, ctx };
}

function createGameplayState(currentPlayer = '0', stage: GameStage = STAGES.ACTING) {
  const { hexes, ports } = generateBoard();
  const desertHex = Object.values(hexes).find((h) => h.terrain === TerrainType.Desert);
  const game = createMockGameState({
    board: { hexes, ports, vertices: {}, edges: {} },
    players: {
      '0': createTestPlayer('0', { victoryPoints: 2, resources: { wood: 2, brick: 2, wheat: 2, sheep: 2, ore: 2 } }),
      '1': createTestPlayer('1', { victoryPoints: 2, resources: { wood: 1, brick: 1, wheat: 1, sheep: 1, ore: 1 } }),
    },
    robberLocation: desertHex?.id || '0',
    rollStatus: stage === STAGES.ROLLING ? RollStatus.IDLE : RollStatus.RESOLVED,
  });

  const ctx: any = {
    currentPlayer,
    turn: 3,
    phase: PHASES.GAMEPLAY,
    activePlayers: { [currentPlayer]: stage },
    numPlayers: 2,
    gameover: null,
  };

  return { game, ctx };
}

describe('CatanMCTSBot Migration & Integration', () => {
  describe('1. Bot Construction & Configuration', () => {
    it('uses Catan-owned MCTS stack with default search bounds (100 iterations, 10 rollout depth, 1.414 UCT)', () => {
      const bot = new CatanMCTSBot();

      expect(bot.iterations).toBe(100);
      expect(bot.maxDepth).toBe(10);
      expect(bot.explorationConstant).toBe(1.414);

      const engine = bot.getEngine();
      expect(engine).toBeDefined();
      expect(engine.selectionPolicy).toBeInstanceOf(UctSelectionPolicy);
    });

    it('respects custom configuration overrides for iterations, maxDepth, and explorationConstant', () => {
      const bot = new CatanMCTSBot({
        iterations: 40,
        playoutDepth: 6,
        explorationConstant: 2.0,
      });

      expect(bot.iterations).toBe(40);
      expect(bot.maxDepth).toBe(6);
      expect(bot.explorationConstant).toBe(2.0);
    });

  });

  describe('2. Legal Action & Lifecycle Coverage', () => {
    it('handles setup settlement placement and returns a valid MAKE_MOVE payload', async () => {
      const { game, ctx } = createSetupState('0');
      const bot = new CatanMCTSBot({ seed: 'setup-seed-1' });

      const state = { G: game, ctx };
      const result = await bot.play(state, '0');

      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.action.type).toBe('MAKE_MOVE');
      expect(result.action.payload.type).toBe('placeSettlement');
      expect(result.action.payload.playerID).toBe('0');
      expect(result.action.payload.args).toBeDefined();
    });

    it('handles rolling stage during gameplay phase', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ROLLING);
      const bot = new CatanMCTSBot({ seed: 'roll-seed-1' });

      const state = { G: game, ctx };
      const result = await bot.play(state, '0');

      expect(result).toBeDefined();
      expect(result.action.type).toBe('MAKE_MOVE');
      expect(['rollDice', 'resolveRoll']).toContain(result.action.payload.type);
      expect(result.action.payload.playerID).toBe('0');
    });

    it('handles robber dismiss stage during gameplay phase', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ROBBER);
      const bot = new CatanMCTSBot({ seed: 'robber-seed-1' });

      const state = { G: game, ctx };
      const result = await bot.play(state, '0');

      expect(result).toBeDefined();
      expect(result.action.type).toBe('MAKE_MOVE');
      expect(result.action.payload.type).toBe('dismissRobber');
      expect(result.action.payload.playerID).toBe('0');
    });

    it('safely returns undefined when requested player is not current active player', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);
      const bot = new CatanMCTSBot();

      const state = { G: game, ctx };
      // Request player '1' when current player is '0'
      const result = await bot.play(state, '1');

      expect(result).toBeUndefined();
    });

    it('returns undefined when state is terminal / gameover', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);
      ctx.gameover = { winner: '0' };
      const bot = new CatanMCTSBot();

      const state = { G: game, ctx };
      const result = await bot.play(state, '0');

      expect(result).toBeUndefined();
    });
  });

  describe('3. Determinism & Seed Reproducibility', () => {
    it('produces identical move choices and payload for two bots given same state and seed', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);

      const bot1 = new CatanMCTSBot({ seed: 'repro-seed-99' });
      const bot2 = new CatanMCTSBot({ seed: 'repro-seed-99' });

      const state1 = { G: JSON.parse(JSON.stringify(game)), ctx: JSON.parse(JSON.stringify(ctx)) };
      const state2 = { G: JSON.parse(JSON.stringify(game)), ctx: JSON.parse(JSON.stringify(ctx)) };

      const res1 = await bot1.play(state1, '0');
      const res2 = await bot2.play(state2, '0');

      expect(res1).toEqual(res2);
    });
  });

  describe('4. Search Bounds & Safety', () => {
    it('respects configured iteration budget during search execution', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);
      const bot = new CatanMCTSBot({
        iterations: 25,
        playoutDepth: 5,
        seed: 'bounds-seed-1',
      });

      const state = { G: game, ctx };
      const res = await bot.play(state, '0');

      expect(res).toBeDefined();
      expect(res.action.type).toBe('MAKE_MOVE');
      // MctsEngine backpropagates once per completed iteration, so rootVisits
      // is the observable execution count for a non-terminal searchable root.
      expect(res.iterations).toBe(25);
      expect(res.rootVisits).toBe(25);
    });

    it('does not mutate input game state during MCTS search', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);
      const gameSnapshot = JSON.stringify(game);
      const ctxSnapshot = JSON.stringify(ctx);

      const bot = new CatanMCTSBot({ iterations: 30, seed: 'immutability-check' });
      await bot.play({ G: game, ctx }, '0');

      expect(JSON.stringify(game)).toBe(gameSnapshot);
      expect(JSON.stringify(ctx)).toBe(ctxSnapshot);
    });
  });

  describe('5. Strategic Intent & Evaluator Baseline', () => {
    it('configures CATAN_MCTS_EVALUATOR_WEIGHTS focusing on VP and structure expansion', () => {
      expect(CATAN_MCTS_EVALUATOR_WEIGHTS.victoryPoints).toBe(10);
      expect(CATAN_MCTS_EVALUATOR_WEIGHTS.cities).toBe(4);
      expect(CATAN_MCTS_EVALUATOR_WEIGHTS.settlements).toBe(2);
      expect(CATAN_MCTS_EVALUATOR_WEIGHTS.roadLength).toBe(0.5);

      expect(CATAN_MCTS_EVALUATOR_WEIGHTS.productionPips).toBe(0);
      expect(CATAN_MCTS_EVALUATOR_WEIGHTS.resourceDiversity).toBe(0);
      expect(CATAN_MCTS_EVALUATOR_WEIGHTS.synergyOreWheat).toBe(0);
      expect(CATAN_MCTS_EVALUATOR_WEIGHTS.synergyWoodBrick).toBe(0);
      expect(CATAN_MCTS_EVALUATOR_WEIGHTS.settlementSpots).toBe(0);
      expect(CATAN_MCTS_EVALUATOR_WEIGHTS.ports).toBe(0);
      expect(CATAN_MCTS_EVALUATOR_WEIGHTS.productionAdvantage).toBe(0);
    });
  });
});
