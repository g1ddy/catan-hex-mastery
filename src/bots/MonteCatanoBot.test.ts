/**
 * @jest-environment jsdom
 */
import { MonteCatanoBot, MONTE_CATANO_EVALUATOR_WEIGHTS } from './MonteCatanoBot';
import { MonteCatanoRuntimeAdapter } from '../adapters/runtime/MonteCatanoBot';
import { CatanMCTSBot, CATAN_MCTS_EVALUATOR_WEIGHTS } from './CatanMCTSBot';
import { Bot } from '../adapters/runtime/boardgame';
import { CatanEvaluator } from '../game/ai/catan/CatanEvaluator';
import { CatanSearchGame } from '../game/ai/catan/CatanSearchGame';
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
    it('ensures MonteCatanoBot can be instantiated and used without boardgame.io Bot base class', () => {
      const bot = new MonteCatanoBot();
      expect(bot).not.toBeInstanceOf(Bot);
      expect(bot.iterations).toBe(200);
      expect(bot.maxDepth).toBe(50);
      expect(bot.explorationConstant).toBe(1.414);
      expect(bot.evaluatorWeights).toEqual(MONTE_CATANO_EVALUATOR_WEIGHTS);
    });

    it('ensures MonteCatanoRuntimeAdapter in adapters/runtime is the sole framework compatibility boundary', () => {
      const adapter = new MonteCatanoRuntimeAdapter();
      expect(adapter).toBeInstanceOf(Bot);
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

  describe('2. Behavioral Characterization & Evaluator Strategy', () => {
    it('verifies MONTE_CATANO_EVALUATOR_WEIGHTS configuration parameters are distinct from baseline MCTS', () => {
      expect(MONTE_CATANO_EVALUATOR_WEIGHTS).not.toEqual(CATAN_MCTS_EVALUATOR_WEIGHTS);

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

    it('demonstrates strategic behavioral consequences of MonteCatano evaluator on a production-engine state', () => {
      const searchGame = new CatanSearchGame();

      const h1 = { q: 0, r: 0, s: 0 };
      const h2 = { q: 1, r: -1, s: 0 };
      const h3 = { q: 0, r: 1, s: -1 };
      const h4 = { q: -1, r: 1, s: 0 };
      const h5 = { q: -1, r: 0, s: 1 };
      const h6 = { q: 0, r: -1, s: 1 };

      const id1 = `${h1.q},${h1.r},${h1.s}`;
      const id2 = `${h2.q},${h2.r},${h2.s}`;
      const id3 = `${h3.q},${h3.r},${h3.s}`;
      const id4 = `${h4.q},${h4.r},${h4.s}`;
      const id5 = `${h5.q},${h5.r},${h5.s}`;
      const id6 = `${h6.q},${h6.r},${h6.s}`;

      const v0_1 = `${id1}::${id2}::${id3}`;
      const v0_2 = `${id1}::${id4}::${id5}`;
      const v1_1 = `${id1}::${id5}::${id6}`;

      const game = createMockGameState({
        board: {
          hexes: {
            [id1]: { id: id1, coords: h1, terrain: TerrainType.Mountains, tokenValue: 6 }, // Ore
            [id2]: { id: id2, coords: h2, terrain: TerrainType.Fields, tokenValue: 8 },    // Wheat
            [id3]: { id: id3, coords: h3, terrain: TerrainType.Forest, tokenValue: 5 },    // Wood
            [id4]: { id: id4, coords: h4, terrain: TerrainType.Hills, tokenValue: 9 },     // Brick
            [id5]: { id: id5, coords: h5, terrain: TerrainType.Pasture, tokenValue: 2 },   // Sheep 2
            [id6]: { id: id6, coords: h6, terrain: TerrainType.Pasture, tokenValue: 3 },   // Sheep 3
          },
          vertices: {
            [v0_1]: { owner: '0', type: 'settlement' },
            [v0_2]: { owner: '0', type: 'settlement' },
            [v1_1]: { owner: '1', type: 'settlement' },
          },
          edges: {},
          ports: {},
        },
        players: {
          '0': createTestPlayer('0', { victoryPoints: 2, settlements: [v0_1, v0_2] }),
          '1': createTestPlayer('1', { victoryPoints: 1, settlements: [v1_1] }),
        },
      });

      const context = {
        currentPlayer: '0',
        turn: 3,
        phase: PHASES.GAMEPLAY,
        stagesByPlayer: { '0': STAGES.ACTING },
        numPlayers: 2,
        gameover: null,
      };

      const searchState = { game, context };

      const baselineEvaluator = new CatanEvaluator(CATAN_MCTS_EVALUATOR_WEIGHTS);
      const monteEvaluator = new CatanEvaluator(MONTE_CATANO_EVALUATOR_WEIGHTS);

      const baselineUtility = baselineEvaluator.evaluate(searchGame, searchState, false);
      const monteUtility = monteEvaluator.evaluate(searchGame, searchState, false);

      // Under baseline MCTS (which ignores pips, diversity, synergies), player 0 gets score based purely on VP/structures
      // Under MonteCatano evaluator (which heavily rewards high pips, 4-resource diversity, and Ore+Wheat synergy),
      // Player 0 receives a substantially higher utility than Player 1.
      expect(monteUtility['0']).toBeGreaterThan(monteUtility['1']);
      expect(monteUtility['0'] - monteUtility['1']).toBeGreaterThan(baselineUtility['0'] - baselineUtility['1']);
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

    it('verifies runtime adapter delegates play calls properly', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);
      const adapter = new MonteCatanoRuntimeAdapter({ iterations: 10, seed: 'adapter-test' });

      const result = await adapter.play({ G: game, ctx }, '0');
      expect(result).toBeDefined();
      expect(result.action.type).toBe('MAKE_MOVE');
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
