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
