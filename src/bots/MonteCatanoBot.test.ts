/**
 * @jest-environment jsdom
 */
import { MonteCatanoBot, MonteCatanoRuntimeAdapter, MONTE_CATANO_EVALUATOR_WEIGHTS } from './MonteCatanoBot';
import { CatanMCTSBot, CATAN_MCTS_EVALUATOR_WEIGHTS } from './CatanMCTSBot';
import { Bot } from '../adapters/runtime/boardgame';
import { createMockGameState, createTestPlayer } from '../game/testUtils';
import { RollStatus, TerrainType } from '../game/core/types';
import { PHASES, STAGES, GameStage } from '../game/core/constants';
import { generateBoard } from '../game/generation/boardGen';

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

describe('MonteCatanoBot Migration & Integration', () => {
  describe('1. Architectural Boundary & Configuration', () => {
    it('ensures MonteCatanoBot does not inherit from boardgame.io Bot', () => {
      const bot = new MonteCatanoBot();
      expect(bot).not.toBeInstanceOf(Bot);
    });

    it('ensures MonteCatanoRuntimeAdapter extends boardgame.io Bot as the sole framework boundary', () => {
      const adapter = new MonteCatanoRuntimeAdapter();
      expect(adapter).toBeInstanceOf(Bot);
    });

    it('uses Catan-owned MCTS stack with default search bounds (200 iterations, 50 playout depth, 1.414 UCT)', () => {
      const bot = new MonteCatanoBot();

      expect(bot.iterations).toBe(200);
      expect(bot.maxDepth).toBe(50);
      expect(bot.explorationConstant).toBe(1.414);
      expect(bot.evaluatorWeights).toEqual(MONTE_CATANO_EVALUATOR_WEIGHTS);
    });

    it('respects custom configuration overrides for iterations, maxDepth, and explorationConstant', () => {
      const bot = new MonteCatanoBot({
        iterations: 50,
        playoutDepth: 20,
        explorationConstant: 2.0,
      });

      expect(bot.iterations).toBe(50);
      expect(bot.maxDepth).toBe(20);
      expect(bot.explorationConstant).toBe(2.0);
    });
  });

  describe('2. Strategic Distinctiveness', () => {
    it('verifies MONTE_CATANO_EVALUATOR_WEIGHTS is meaningfully distinct from CATAN_MCTS_EVALUATOR_WEIGHTS', () => {
      expect(MONTE_CATANO_EVALUATOR_WEIGHTS).not.toEqual(CATAN_MCTS_EVALUATOR_WEIGHTS);

      // MonteCatanoBot values production pips, diversity, synergies, and cities much higher than baseline MCTS
      expect(MONTE_CATANO_EVALUATOR_WEIGHTS.productionPips).toBeGreaterThan(
        CATAN_MCTS_EVALUATOR_WEIGHTS.productionPips ?? 0
      );
      expect(MONTE_CATANO_EVALUATOR_WEIGHTS.resourceDiversity).toBeGreaterThan(
        CATAN_MCTS_EVALUATOR_WEIGHTS.resourceDiversity ?? 0
      );
      expect(MONTE_CATANO_EVALUATOR_WEIGHTS.synergyOreWheat).toBeGreaterThan(
        CATAN_MCTS_EVALUATOR_WEIGHTS.synergyOreWheat ?? 0
      );
      expect(MONTE_CATANO_EVALUATOR_WEIGHTS.synergyWoodBrick).toBeGreaterThan(
        CATAN_MCTS_EVALUATOR_WEIGHTS.synergyWoodBrick ?? 0
      );
      expect(MONTE_CATANO_EVALUATOR_WEIGHTS.cities).toBeGreaterThan(
        CATAN_MCTS_EVALUATOR_WEIGHTS.cities ?? 0
      );

      const catanMctsBot = new CatanMCTSBot();
      const monteCatanoBot = new MonteCatanoBot();

      expect(monteCatanoBot.iterations).toBe(200);
      expect(catanMctsBot.iterations).toBe(100);
      expect(monteCatanoBot.maxDepth).toBe(50);
      expect(catanMctsBot.maxDepth).toBe(10);
    });
  });

  describe('3. Legal Action & Lifecycle Coverage', () => {
    it('handles setup settlement placement and returns a valid MAKE_MOVE payload', async () => {
      const { game, ctx } = createSetupState('0');
      const bot = new MonteCatanoBot({ iterations: 10, playoutDepth: 5, seed: 'setup-test' });

      const state = { G: game, ctx };
      const result = await bot.play(state, '0');

      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.action.type).toBe('MAKE_MOVE');
      expect(result.action.payload.type).toBe('placeSettlement');
      expect(typeof result.action.payload.args[0]).toBe('string');
      expect(result.action.payload.playerID).toBe('0');
    });

    it('handles rolling stage during gameplay phase', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ROLLING);
      const bot = new MonteCatanoBot({ iterations: 10, playoutDepth: 5, seed: 'roll-test' });

      const state = { G: game, ctx };
      const result = await bot.play(state, '0');

      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.action.type).toBe('MAKE_MOVE');
      expect(['rollDice', 'resolveRoll']).toContain(result.action.payload.type);
      expect(result.action.payload.playerID).toBe('0');
    });

    it('handles robber dismiss stage during gameplay phase', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ROBBER);
      const bot = new MonteCatanoBot({ iterations: 10, playoutDepth: 5, seed: 'robber-test' });

      const state = { G: game, ctx };
      const result = await bot.play(state, '0');

      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.action.type).toBe('MAKE_MOVE');
      expect(result.action.payload.type).toBe('dismissRobber');
      expect(result.action.payload.playerID).toBe('0');
    });

    it('safely returns undefined when requested player is not current active player', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);
      const bot = new MonteCatanoBot({ iterations: 10, seed: 'inactive-test' });

      const state = { G: game, ctx };
      const result = await bot.play(state, '1');

      expect(result).toBeUndefined();
    });

    it('returns undefined when state is terminal / gameover', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);
      ctx.gameover = { winner: '0' };

      const bot = new MonteCatanoBot({ iterations: 10, seed: 'terminal-test' });
      const state = { G: game, ctx };
      const result = await bot.play(state, '0');

      expect(result).toBeUndefined();
    });
  });

  describe('4. Determinism & Seed Reproducibility', () => {
    it('produces identical move choices and payload for two bots given same state and seed', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);

      const seed = 'reproducible-seed-xyz';
      const bot1 = new MonteCatanoBot({ iterations: 20, playoutDepth: 10, seed });
      const bot2 = new MonteCatanoBot({ iterations: 20, playoutDepth: 10, seed });

      const state1 = { G: JSON.parse(JSON.stringify(game)), ctx: JSON.parse(JSON.stringify(ctx)) };
      const state2 = { G: JSON.parse(JSON.stringify(game)), ctx: JSON.parse(JSON.stringify(ctx)) };

      const res1 = await bot1.play(state1, '0');
      const res2 = await bot2.play(state2, '0');

      expect(res1).toBeDefined();
      expect(res2).toBeDefined();
      expect(res1.action).toEqual(res2.action);
    });
  });

  describe('5. Search Bounds & Input Immutability', () => {
    it('respects configured iteration budget during search execution', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);

      const bot = new MonteCatanoBot({ iterations: 15, playoutDepth: 5, seed: 'budget-test' });
      const result = await bot.play({ G: game, ctx }, '0');

      expect(result.iterations).toBe(15);
      expect(result.rootVisits).toBe(15);
    });

    it('does not mutate input game state during MCTS search', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);

      const originalStateSnapshot = JSON.stringify(game);
      const originalCtxSnapshot = JSON.stringify(ctx);

      const bot = new MonteCatanoBot({ iterations: 25, playoutDepth: 10, seed: 'immutability-test' });
      await bot.play({ G: game, ctx }, '0');

      expect(JSON.stringify(game)).toBe(originalStateSnapshot);
      expect(JSON.stringify(ctx)).toBe(originalCtxSnapshot);
    });
  });
});
