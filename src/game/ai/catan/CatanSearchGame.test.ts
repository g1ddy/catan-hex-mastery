import { CatanSearchGame } from './CatanSearchGame';
import { CatanSearchState } from './CatanSearchState';
import { SeededSearchRandom } from '../search/SearchRandom';
import { createMockGameState, createTestPlayer } from '../../testUtils';
import { GameContext, TerrainType } from '../../core/types';
import { PHASES, STAGES, WINNING_SCORE } from '../../core/constants';
import { generateBoard } from '../../generation/boardGen';

function createMockSetupState(): CatanSearchState {
  const { hexes, ports } = generateBoard();
  const desertHex = Object.values(hexes).find(h => h.terrain === TerrainType.Desert);
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

describe('CatanSearchGame Adapter', () => {
  let catanGame: CatanSearchGame;

  beforeEach(() => {
    catanGame = new CatanSearchGame();
  });

  it('returns current player and stable player IDs', () => {
    const state = createMockSetupState();
    expect(catanGame.getCurrentPlayer(state)).toBe('0');
    expect(catanGame.getPlayers(state)).toEqual(['0', '1']);
  });

  it('enumerates legal placement actions during setup phase', () => {
    const state = createMockSetupState();
    const legalActions = catanGame.getLegalActions(state);

    expect(legalActions.length).toBeGreaterThan(0);
    expect(legalActions.every(a => a.move === 'placeSettlement')).toBe(true);
  });

  it('applies a legal placement action and updates lifecycle state deterministically without mutating input state', () => {
    const state = createMockSetupState();
    const legalActions = catanGame.getLegalActions(state);
    const chosenAction = legalActions[0];
    const rng = new SeededSearchRandom(42);

    const initialGameJson = JSON.stringify(state.game);
    const initialCtxJson = JSON.stringify(state.context);

    const nextState = catanGame.applyAction(state, chosenAction, rng);

    // Verify input state was NOT mutated
    expect(JSON.stringify(state.game)).toBe(initialGameJson);
    expect(JSON.stringify(state.context)).toBe(initialCtxJson);

    // Verify next state reflects settlement placement and transition to placeRoad stage
    expect(nextState.game.players['0'].settlements).toContain(chosenAction.args[0]);
    expect(nextState.context.currentPlayer).toBe('0');
    expect(nextState.context.stagesByPlayer).toEqual({ '0': STAGES.PLACE_ROAD });
  });

  it('handles robber destination and victim choices', () => {
    const { hexes, ports } = generateBoard();
    const hexList = Object.values(hexes);
    const otherHex = hexList[1];

    const game = createMockGameState({
      board: {
        hexes,
        ports,
        vertices: {
          'v1': { owner: '1', type: 'settlement' },
        },
        edges: {},
      },
      players: {
        '0': createTestPlayer('0'),
        '1': createTestPlayer('1', { resources: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 } }),
      },
      robberLocation: otherHex.id,
    });

    const context: GameContext = {
      currentPlayer: '0',
      turn: 5,
      phase: PHASES.GAMEPLAY,
      stagesByPlayer: { '0': STAGES.ROBBER },
      numPlayers: 2,
      gameover: null,
    };

    const state: CatanSearchState = { game, context };
    const legalActions = catanGame.getLegalActions(state);

    expect(legalActions.length).toBeGreaterThan(0);
    expect(legalActions.every(a => a.move === 'dismissRobber')).toBe(true);

    const rng = new SeededSearchRandom(12345);
    const dismissAction = legalActions[0];
    const nextState = catanGame.applyAction(state, dismissAction, rng);

    expect(nextState.context.stagesByPlayer).toEqual({ '0': STAGES.ACTING });
  });

  it('detects terminal winner state', () => {
    const state = createMockSetupState();
    state.game.players['0'].victoryPoints = WINNING_SCORE;

    expect(catanGame.isTerminal(state)).toBe(true);
    expect(catanGame.getTerminalResult(state)).toEqual({ kind: 'winner', winnerId: '0' });
    expect(catanGame.getLegalActions(state)).toEqual([]);
  });

  it('detects terminal draw state when max turns exceeded', () => {
    const state = createMockSetupState();
    state.context.turn = 201;

    expect(catanGame.isTerminal(state)).toBe(true);
    expect(catanGame.getTerminalResult(state)).toEqual({ kind: 'draw' });
    expect(catanGame.getLegalActions(state)).toEqual([]);
  });

  it('reproduces identical simulation traces given the same initial state and seed', () => {
    const state = createMockSetupState();
    const legalActions = catanGame.getLegalActions(state);

    const rng1 = new SeededSearchRandom('fixed-seed');
    const rng2 = new SeededSearchRandom('fixed-seed');

    const nextState1 = catanGame.applyAction(state, legalActions[0], rng1);
    const nextState2 = catanGame.applyAction(state, legalActions[0], rng2);

    expect(JSON.stringify(nextState1)).toBe(JSON.stringify(nextState2));
  });
});
