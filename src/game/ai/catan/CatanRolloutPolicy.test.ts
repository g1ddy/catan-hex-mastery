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

  it('rejects non-finite and negative evalWeight and customWeights', () => {
    expect(() => new CatanRolloutPolicy({ evalWeight: NaN })).toThrow('Invalid evalWeight');
    expect(() => new CatanRolloutPolicy({ evalWeight: Infinity })).toThrow('Invalid evalWeight');
    expect(() => new CatanRolloutPolicy({ evalWeight: -1 })).toThrow('Invalid evalWeight');
    expect(() => new CatanRolloutPolicy({ customWeights: { rollDice: -5 } })).toThrow('Invalid custom weight');
    expect(() => new CatanRolloutPolicy({ customWeights: { buildCity: NaN } })).toThrow('Invalid custom weight');
  });

  it('does not execute stochastic candidates during candidate scoring', () => {
    const state = createMockSetupState();
    let rngCalls = 0;

    const trackingRng: SearchRandom = {
      next: () => {
        rngCalls++;
        return 0.5;
      },
      integer: (max) => {
        rngCalls++;
        return Math.floor(0.5 * max);
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

    const stochasticAction = { move: 'resolveRoll' as const, args: [] as [] };
    const deterministicAction = { move: 'rollDice' as const, args: [] as [] };

    const game: CatanSearchGame = {
      getCurrentPlayer: (s) => searchGame.getCurrentPlayer(s),
      getLegalActions: () => [stochasticAction, deterministicAction],
      isTerminal: (s) => searchGame.isTerminal(s),
      getTerminalResult: (s) => searchGame.getTerminalResult(s),
      getPlayers: (s) => searchGame.getPlayers(s),
      applyAction: (s, action, random) => {
        // Candidate scoring must never apply the stochastic action. The deterministic
        // action is safe to score with the policy's throwing dummy RNG.
        expect(action.move).toBe('rollDice');
        expect(random).not.toBe(trackingRng);
        return s;
      },
    };

    const chosen = policy.selectAction(game, state, trackingRng);

    expect(chosen).toBeDefined();
    // Only the final weighted-choice draw uses the caller RNG.
    expect(rngCalls).toBe(1);
  });

  it('reordering stochastic candidates does not perturb candidate-scoring RNG consumption', () => {
    const state = createMockSetupState();
    const stochasticAction = { move: 'resolveRoll' as const, args: [] as [] };
    const deterministicAction = { move: 'rollDice' as const, args: [] as [] };

    const makeRng = () => {
      let calls = 0;
      const rng: SearchRandom = {
        next: () => {
          calls++;
          return 0.5;
        },
        integer: (max) => {
          calls++;
          return Math.floor(0.5 * max);
        },
        pick: (arr) => {
          calls++;
          return arr[0];
        },
        die: () => {
          calls++;
          return 1;
        },
      };
      return { rng, getCalls: () => calls };
    };

    const makeGame = (actions: typeof [stochasticAction, deterministicAction]) => ({
      getCurrentPlayer: (s: CatanSearchState) => searchGame.getCurrentPlayer(s),
      getLegalActions: () => actions,
      isTerminal: (s: CatanSearchState) => searchGame.isTerminal(s),
      getTerminalResult: (s: CatanSearchState) => searchGame.getTerminalResult(s),
      getPlayers: (s: CatanSearchState) => searchGame.getPlayers(s),
      applyAction: (s: CatanSearchState, action: typeof deterministicAction, random: SearchRandom) => {
        expect(action.move).toBe('rollDice');
        expect(random).not.toBeNull();
        return s;
      },
    });

    const first = makeRng();
    const second = makeRng();

    policy.selectAction(makeGame([stochasticAction, deterministicAction]), state, first.rng);
    policy.selectAction(makeGame([deterministicAction, stochasticAction]), state, second.rng);

    expect(first.getCalls()).toBe(1);
    expect(second.getCalls()).toBe(1);
  });

  it('consumes RNG for a stochastic transition exactly when applyAction is called', () => {
    const state = createMockSetupState();
    state.context.phase = PHASES.GAMEPLAY;
    state.context.stagesByPlayer = { '0': STAGES.ROLLING };
    state.game.rollStatus = 'rolling' as any;

    const delegateRng = new SeededSearchRandom('stochastic-apply-test');
    let rngCalls = 0;
    const countingRng: SearchRandom = {
      next: () => {
        rngCalls++;
        return delegateRng.next();
      },
      integer: (max) => {
        rngCalls++;
        return delegateRng.integer(max);
      },
      pick: (arr) => {
        rngCalls++;
        return delegateRng.pick(arr);
      },
      die: (sides) => {
        rngCalls++;
        return delegateRng.die(sides);
      },
    };

    expect(rngCalls).toBe(0);

    // Action selection has a single legal resolveRoll action, so it returns without
    // consuming the RNG or applying the stochastic transition.
    const chosenAction = policy.selectAction(searchGame, state, countingRng);

    expect(chosenAction).not.toBeNull();
    expect(chosenAction?.move).toBe('resolveRoll');
    expect(rngCalls).toBe(0);

    // The actual transition is where the two dice draws occur.
    const nextState = searchGame.applyAction(state, chosenAction!, countingRng);

    expect(nextState.game.rollStatus).toBe('resolved');
    expect(rngCalls).toBe(2);
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
