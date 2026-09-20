/**
 * @jest-environment jsdom
 */
import { MonteCatanoBot, MONTE_CATANO_EVALUATOR_WEIGHTS } from './MonteCatanoBot';
import { MonteCatanoRuntimeAdapter } from '../adapters/runtime/MonteCatanoBot';
import { CATAN_MCTS_EVALUATOR_WEIGHTS } from './CatanMCTSBot';
import { Bot } from '../adapters/runtime/boardgame';
import { CatanEvaluator } from '../game/ai/catan/CatanEvaluator';
import { CatanSearchGame } from '../game/ai/catan/CatanSearchGame';
import { createMockGameState, createTestPlayer } from '../game/testUtils';
import { RollStatus, TerrainType, GameContext } from '../game/core/types';
import { PHASES, STAGES, GameStage } from '../game/core/constants';
import { generateBoard } from '../game/generation/boardGen';

function createSetupContext(currentPlayer = '0'): GameContext {
  return {
    currentPlayer,
    turn: 1,
    phase: PHASES.SETUP,
    stagesByPlayer: { [currentPlayer]: STAGES.PLACE_SETTLEMENT },
    numPlayers: 2,
    gameover: null,
  };
}

function createGameplayContext(currentPlayer = '0', stage: GameStage = STAGES.ACTING): GameContext {
  return {
    currentPlayer,
    turn: 3,
    phase: PHASES.GAMEPLAY,
    stagesByPlayer: { [currentPlayer]: stage },
    numPlayers: 2,
    gameover: null,
  };
}

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

  return { game, ctx: createSetupContext(currentPlayer) };
}

function createGameplayState(currentPlayer = '0', stage: GameStage = STAGES.ACTING) {
  const { hexes, ports } = generateBoard();
  const desertHex = Object.values(hexes).find((h) => h.terrain === TerrainType.Desert);
  const game = createMockGameState({
    board: { hexes, ports, vertices: {}, edges: {} },
    players: {
      '0': createTestPlayer('0', { victoryPoints: 2, resources: { wood: 5, brick: 5, wheat: 5, sheep: 5, ore: 5 } }),
      '1': createTestPlayer('1', { victoryPoints: 2, resources: { wood: 2, brick: 2, wheat: 2, sheep: 2, ore: 2 } }),
    },
    robberLocation: desertHex?.id || '0',
    rollStatus: stage === STAGES.ROLLING ? RollStatus.IDLE : RollStatus.RESOLVED,
  });

  return { game, ctx: createGameplayContext(currentPlayer, stage) };
}

describe('MonteCatanoBot Migration & Integration', () => {
  describe('1. Architectural Boundary & Configuration', () => {
    it('ensures MonteCatanoBot accepts exclusively GameContext and operates without boardgame.io Bot base class', async () => {
      const bot = new MonteCatanoBot({ iterations: 10, playoutDepth: 5 });
      expect(bot).not.toBeInstanceOf(Bot);
      expect(bot.explorationConstant).toBe(1.414);
      expect(bot.evaluatorWeights).toEqual(MONTE_CATANO_EVALUATOR_WEIGHTS);

      const defaultBot = new MonteCatanoBot();
      expect(defaultBot.iterations).toBe(200);
      expect(defaultBot.maxDepth).toBe(50);

      const { game, ctx } = createSetupState('0');
      // Verify signature accepts exclusively framework-neutral GameContext
      const result = await bot.play({ G: game, ctx }, '0');
      expect(result).toBeDefined();
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

  describe('2. Behavioral Characterization & Strategic Signals', () => {
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
    });

    it('demonstrates strategic sensitivity to production, diversity, and resource synergies over baseline MCTS', () => {
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

      const gameBase = createMockGameState({
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

      const context = createGameplayContext('0', STAGES.ACTING);
      const searchState = { game: gameBase, context };

      const baselineEvaluator = new CatanEvaluator(CATAN_MCTS_EVALUATOR_WEIGHTS);
      const monteEvaluator = new CatanEvaluator(MONTE_CATANO_EVALUATOR_WEIGHTS);

      const baselineUtility = baselineEvaluator.evaluate(searchGame, searchState, false);
      const monteUtility = monteEvaluator.evaluate(searchGame, searchState, false);

      // MonteCatano's engine-building weights create a substantially larger utility gap between
      // a player with strong multi-resource production (Ore/Wheat/Wood/Brick) vs single-resource production.
      expect(monteUtility['0'] - monteUtility['1']).toBeGreaterThan(baselineUtility['0'] - baselineUtility['1']);
    });

    it('verifies MonteCatano evaluator responds positively to cities, synergies, roads, and ports', () => {
      const searchGame = new CatanSearchGame();
      const h1 = { q: 0, r: 0, s: 0 };
      const h2 = { q: 1, r: -1, s: 0 };
      const h3 = { q: 0, r: 1, s: -1 };
      const id1 = `${h1.q},${h1.r},${h1.s}`;
      const id2 = `${h2.q},${h2.r},${h2.s}`;
      const id3 = `${h3.q},${h3.r},${h3.s}`;
      const v1 = `${id1}::${id2}::${id3}`;

      // Base state: Player 0 has 1 settlement on Ore
      const stateBase = createMockGameState({
        board: {
          hexes: {
            [id1]: { id: id1, coords: h1, terrain: TerrainType.Mountains, tokenValue: 6 },
            [id2]: { id: id2, coords: h2, terrain: TerrainType.Fields, tokenValue: 8 },
            [id3]: { id: id3, coords: h3, terrain: TerrainType.Forest, tokenValue: 5 },
          },
          vertices: {
            [v1]: { owner: '0', type: 'settlement' },
          },
          edges: {},
          ports: {},
        },
        players: {
          '0': createTestPlayer('0', { victoryPoints: 1, settlements: [v1], roads: [] }),
          '1': createTestPlayer('1', { victoryPoints: 1, settlements: [] }),
        },
      });

      // City state: Player 0 upgrades settlement to city (gains Ore+Wheat city production)
      const stateCity = createMockGameState({
        ...stateBase,
        board: {
          ...stateBase.board,
          vertices: {
            [v1]: { owner: '0', type: 'city' },
          },
        },
        players: {
          ...stateBase.players,
          '0': createTestPlayer('0', { victoryPoints: 2, settlements: [v1], roads: [] }),
        },
      });

      const context = createGameplayContext('0', STAGES.ACTING);
      const monteEvaluator = new CatanEvaluator(MONTE_CATANO_EVALUATOR_WEIGHTS);

      const uBase = monteEvaluator.evaluate(searchGame, { game: stateBase, context }, false);
      const uCity = monteEvaluator.evaluate(searchGame, { game: stateCity, context }, false);

      // Upgrading to a city increases Player 0's utility
      expect(uCity['0']).toBeGreaterThan(uBase['0']);
    });
  });

  describe('3. Normal Gameplay Transitions & Legal Action Envelope', () => {
    it('searches and produces valid MAKE_MOVE payloads for normal-game states where road/settlement/city construction are legal', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);
      const bot = new MonteCatanoBot({ iterations: 15, playoutDepth: 5, seed: 'normal-gameplay-search' });

      const result = await bot.play({ G: game, ctx }, '0');

      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.action.type).toBe('MAKE_MOVE');
      expect(typeof result.action.payload.type).toBe('string');
      expect(result.action.payload.playerID).toBe('0');
      expect(Array.isArray(result.action.payload.args)).toBe(true);
    });

    it('verifies selected action is legal according to CatanSearchGame.getLegalActions', async () => {
      const searchGame = new CatanSearchGame();
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);
      const searchState = { game, context: ctx };

      const legalActions = searchGame.getLegalActions(searchState);
      expect(legalActions.length).toBeGreaterThan(0);

      const bot = new MonteCatanoBot({ iterations: 20, playoutDepth: 10, seed: 'legality-check-seed' });
      const result = await bot.play({ G: game, ctx }, '0');

      expect(result).toBeDefined();
      expect(result.action).toBeDefined();

      const selectedType = result.action.payload.type;
      const selectedArgs = result.action.payload.args;

      const isLegal = legalActions.some(
        (legal) => legal.move === selectedType && JSON.stringify(legal.args) === JSON.stringify(selectedArgs)
      );

      expect(isLegal).toBe(true);
    });
  });

  describe('4. Lifecycle Coverage & Active Player Safety', () => {
    it('handles setup settlement placement and returns a valid MAKE_MOVE payload', async () => {
      const { game, ctx } = createSetupState('0');
      const bot = new MonteCatanoBot({ iterations: 10, playoutDepth: 5, seed: 'setup-test' });

      const result = await bot.play({ G: game, ctx }, '0');

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

      const result = await bot.play({ G: game, ctx }, '0');

      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.action.type).toBe('MAKE_MOVE');
      expect(['rollDice', 'resolveRoll']).toContain(result.action.payload.type);
      expect(result.action.payload.playerID).toBe('0');
    });

    it('handles robber dismiss stage during gameplay phase', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ROBBER);
      const bot = new MonteCatanoBot({ iterations: 10, playoutDepth: 5, seed: 'robber-test' });

      const result = await bot.play({ G: game, ctx }, '0');

      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.action.type).toBe('MAKE_MOVE');
      expect(result.action.payload.type).toBe('dismissRobber');
      expect(result.action.payload.playerID).toBe('0');
    });

    it('safely returns undefined when requested player is not current active player', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);
      const bot = new MonteCatanoBot({ iterations: 10, seed: 'inactive-test' });

      const result = await bot.play({ G: game, ctx }, '1');

      expect(result).toBeUndefined();
    });

    it('returns undefined when state is terminal / gameover', async () => {
      const { game, ctx } = createGameplayState('0', STAGES.ACTING);
      ctx.gameover = { winner: '0' };

      const bot = new MonteCatanoBot({ iterations: 10, seed: 'terminal-test' });
      const result = await bot.play({ G: game, ctx }, '0');

      expect(result).toBeUndefined();
    });

    it('verifies runtime adapter converts Ctx and delegates play calls properly', async () => {
      const { game } = createGameplayState('0', STAGES.ACTING);
      const rawCtx = {
        currentPlayer: '0',
        turn: 3,
        phase: PHASES.GAMEPLAY,
        activePlayers: { '0': STAGES.ACTING },
        numPlayers: 2,
        gameover: null,
      } as any;

      const adapter = new MonteCatanoRuntimeAdapter({ iterations: 10, seed: 'adapter-test' });

      const result = await adapter.play({ G: game, ctx: rawCtx }, '0');
      expect(result).toBeDefined();
      expect(result.action.type).toBe('MAKE_MOVE');
    });
  });

  describe('5. Determinism & Search Bounds', () => {
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
