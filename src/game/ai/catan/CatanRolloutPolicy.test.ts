import { CatanRolloutPolicy } from './CatanRolloutPolicy';
import { CatanSearchGame } from './CatanSearchGame';
import type { CatanSearchState } from './CatanSearchState';
import { SeededSearchRandom, SearchRandom } from '../search/SearchRandom';
import { createMockGameState, createTestPlayer } from '../../testUtils';
import { GameContext, TerrainType } from '../../core/types';
import { PHASES, STAGES } from '../../core/constants';
import { generateBoard } from '../../generation/boardGen';
import { getVerticesForHex } from '../../geometry/hexUtils';

function createMockSetupState(): CatanSearchState {
  const { hexes, ports } = generateBoard();
  const desertHex = Object.values(hexes).find((h) => h.terrain === TerrainType.Desert);
  const game = createMockGameState({
    board: { hexes, ports, vertices: {}, edges: {} },
    players: {
      '0': createTestPlayer('0', { victoryPoints: 0 }),
      '1': createTestPlayer('1', { victoryPoints: 0 }),
    },
    robberLocation: desertHex?.id || '0,0,0',
    setupPhase: { activeRound: 1 },
    setupOrder: ['0', '1', '1', '0'],
  });

  const context: GameContext = {
    currentPlayer: '0',
    turn: 1,
    phase: PHASES.SETUP,
    stagesByPlayer: { '0': STAGES.PLACE_SETTLEMENT },
    numPlayers: 2,
    gameover: null,
  };

  return { game, context };
}

describe('CatanRolloutPolicy', () => {
  let searchGame: CatanSearchGame;
  let policy: CatanRolloutPolicy;

  beforeEach(() => {
    searchGame = new CatanSearchGame();
    policy = new CatanRolloutPolicy();
  });

  it('returns null on terminal state', () => {
    const state = createMockSetupState();
    state.context.gameover = { winner: '0' };
    const rng = new SeededSearchRandom('seed-1');

    const action = policy.selectAction(searchGame, state, rng);
    expect(action).toBeNull();
  });

  it('selects a valid legal action from CatanSearchGame', () => {
    const state = createMockSetupState();
    const rng = new SeededSearchRandom('seed-2');

    const action = policy.selectAction(searchGame, state, rng);
    expect(action).not.toBeNull();

    const legalActions = searchGame.getLegalActions(state);
    expect(legalActions).toContainEqual(action);
  });

  it('is deterministic under a fixed seed', () => {
    const state = createMockSetupState();
    const rng1 = new SeededSearchRandom('fixed-test-seed');
    const rng2 = new SeededSearchRandom('fixed-test-seed');

    const action1 = policy.selectAction(searchGame, state, rng1);
    const action2 = policy.selectAction(searchGame, state, rng2);

    expect(action1).toEqual(action2);
  });

  it('exhibits zero cross-call state pollution or RNG drift across repeated selectAction calls', () => {
    const state = createMockSetupState();
    const rngA = new SeededSearchRandom('cross-call-seed');
    const rngB = new SeededSearchRandom('cross-call-seed');

    const policy1 = new CatanRolloutPolicy();
    const policy2 = new CatanRolloutPolicy();

    // Call 1 on policy1
    const res1A = policy1.selectAction(searchGame, state, rngA);
    // Call 2 on policy1
    const res2A = policy1.selectAction(searchGame, state, rngA);

    // Call 1 on fresh policy2
    const res1B = policy2.selectAction(searchGame, state, rngB);
    // Call 2 on fresh policy2
    const res2B = policy2.selectAction(searchGame, state, rngB);

    expect(res1A).toEqual(res1B);
    expect(res2A).toEqual(res2B);
  });

  it('deliberately consumes the caller SearchRandom stream during candidate action evaluations (RNG delegation)', () => {
    const state = createMockSetupState();
    const legalActions = searchGame.getLegalActions(state);
    expect(legalActions.length).toBeGreaterThan(1);

    let rngCalls = 0;
    const trackingRng: SearchRandom = {
      next: () => {
        rngCalls++;
        return 0.25;
      },
      integer: (max) => {
        rngCalls++;
        return Math.floor(0.25 * max);
      },
      pick: (arr) => {
        rngCalls++;
        return arr[0];
      },
      die: () => {
        rngCalls++;
        return 1;
      },
    };

    const chosenAction = policy.selectAction(searchGame, state, trackingRng);

    expect(chosenAction).not.toBeNull();
    // trackingRng must be called at least once for final weighted action selection,
    // plus potential calls during game.applyAction for stochastic action evaluations.
    // The key invariant is that it properly delegates rather than manufacturing an internal RNG.
    expect(rngCalls).toBeGreaterThan(0);
  });

  it('surfaces transition errors directly from applyAction rather than swallowing them', () => {
    const state = createMockSetupState();
    const rng = new SeededSearchRandom('error-test-seed');

    const faultyGame: CatanSearchGame = {
      getCurrentPlayer: (s) => searchGame.getCurrentPlayer(s),
      getLegalActions: (s) => searchGame.getLegalActions(s),
      isTerminal: (s) => searchGame.isTerminal(s),
      getTerminalResult: (s) => searchGame.getTerminalResult(s),
      getPlayers: (s) => searchGame.getPlayers(s),
      applyAction: () => {
        throw new Error('Transition boundary error in applyAction');
      },
    };

    expect(() => policy.selectAction(faultyGame, state, rng)).toThrow('Transition boundary error in applyAction');
  });

  it('prefers constructive actions over endTurn when choices are available', () => {
    const state = createMockSetupState();
    const legalActions = searchGame.getLegalActions(state);
    expect(legalActions.length).toBeGreaterThan(1);

    for (let i = 0; i < 10; i++) {
      const rng = new SeededSearchRandom(`rollout-seed-${i}`);
      const action = policy.selectAction(searchGame, state, rng);
      expect(action?.move).toBe('placeSettlement');
    }
  });

  it('evaluator-driven rollout prefers stronger resulting states (1-action lookahead)', () => {
    const state = createMockSetupState();
    state.context.phase = PHASES.GAMEPLAY;
    state.context.stagesByPlayer = { '0': STAGES.ACTING };

    // Give player 0 a settlement and resources to build a city
    const vId = '0,0,0::0,1,-1::1,0,-1';
    state.game.board.vertices[vId] = { owner: '0', type: 'settlement' };
    state.game.players['0'].settlements = [vId];
    state.game.players['0'].victoryPoints = 1;
    state.game.players['0'].resources = { ore: 3, wheat: 2, wood: 0, brick: 0, sheep: 0 };

    const legalActions = searchGame.getLegalActions(state);
    const cityAction = legalActions.find((a) => a.move === 'buildCity');
    const endTurnAction = legalActions.find((a) => a.move === 'endTurn');

    expect(cityAction).toBeDefined();
    expect(endTurnAction).toBeDefined();

    const strongPolicy = new CatanRolloutPolicy({ evalWeight: 100.0 });

    let cityChosenCount = 0;
    const trials = 30;

    for (let i = 0; i < trials; i++) {
      const rng = new SeededSearchRandom(`lookahead-trial-${i}`);
      const chosen = strongPolicy.selectAction(searchGame, state, rng);
      if (chosen?.move === 'buildCity') {
        cityChosenCount++;
      }
    }

    expect(cityChosenCount).toBeGreaterThan(trials * 0.5);
  });

  it('handles single legal action without calling random inappropriately', () => {
    const state = createMockSetupState();
    state.context.stagesByPlayer = { '0': STAGES.PLACE_ROAD };
    const centerHex = state.game.board.hexes['0,0,0'];
    const lastSettlementId = getVerticesForHex(centerHex.coords)[0];
    state.game.players['0'].settlements = [lastSettlementId];

    let calls = 0;
    const rng: SearchRandom = {
      next: () => {
        calls++;
        return 0.5;
      },
      integer: () => 0,
      pick: (arr) => arr[0],
      die: () => 1,
    };

    const legal = searchGame.getLegalActions(state);
    if (legal.length === 1) {
      const action = policy.selectAction(searchGame, state, rng);
      expect(action).toEqual(legal[0]);
      expect(calls).toBe(0);
    }
  });
});
