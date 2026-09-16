import { CatanSearchGame } from './CatanSearchGame';
import { CatanSearchState } from './CatanSearchState';
import { SeededSearchRandom } from '../search/SearchRandom';
import { createMockGameState, createTestPlayer } from '../../testUtils';
import { GameContext, TerrainType, RollStatus } from '../../core/types';
import { PHASES, STAGES, WINNING_SCORE } from '../../core/constants';
import { generateBoard } from '../../generation/boardGen';
import { getVerticesForHex } from '../../geometry/hexUtils';

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

function createMockGameplayState(): CatanSearchState {
  const { hexes, ports } = generateBoard();
  const desertHex = Object.values(hexes).find(h => h.terrain === TerrainType.Desert);
  const game = createMockGameState({
    board: { hexes, ports, vertices: {}, edges: {} },
    players: {
      '0': createTestPlayer('0', { victoryPoints: 0 }),
      '1': createTestPlayer('1', { victoryPoints: 0 }),
    },
    robberLocation: desertHex?.id || '0',
  });

  const context: GameContext = {
    currentPlayer: '0',
    turn: 1,
    phase: PHASES.GAMEPLAY,
    stagesByPlayer: { '0': STAGES.ROLLING },
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

  it('enumerates legal placement actions during setup phase with deterministic ordering', () => {
    const state = createMockSetupState();
    const legalActions1 = catanGame.getLegalActions(state);
    const legalActions2 = catanGame.getLegalActions(state);

    expect(legalActions1.length).toBeGreaterThan(0);
    expect(legalActions1.every(a => a.move === 'placeSettlement')).toBe(true);
    expect(JSON.stringify(legalActions1)).toBe(JSON.stringify(legalActions2));
  });

  it('applies a legal placement action and updates lifecycle state deterministically without mutating input state', () => {
    const state = createMockSetupState();
    const legalActions = catanGame.getLegalActions(state);
    const chosenAction = legalActions[0];
    const rng = new SeededSearchRandom(42);

    const initialGameJson = JSON.stringify(state.game);
    const initialCtxJson = JSON.stringify(state.context);
    const nextState = catanGame.applyAction(state, chosenAction, rng);

    expect(JSON.stringify(state.game)).toBe(initialGameJson);
    expect(JSON.stringify(state.context)).toBe(initialCtxJson);
    expect(nextState.game.players['0'].settlements).toContain(chosenAction.args[0]);
    expect(nextState.context.currentPlayer).toBe('0');
    expect(nextState.context.stagesByPlayer).toEqual({ '0': STAGES.PLACE_ROAD });
  });

  it('transitions setup settlement to road and then advances the snake draft after the road', () => {
    const state = createMockSetupState();
    const settlementAction = catanGame.getLegalActions(state)[0];
    const afterSettlement = catanGame.applyAction(state, settlementAction, new SeededSearchRandom(1));
    const roadActions = catanGame.getLegalActions(afterSettlement);

    expect(roadActions.length).toBeGreaterThan(0);
    expect(roadActions.every(a => a.move === 'placeRoad')).toBe(true);

    const afterRoad = catanGame.applyAction(afterSettlement, roadActions[0], new SeededSearchRandom(1));
    expect(afterRoad.context.currentPlayer).toBe('1');
    expect(afterRoad.context.turn).toBe(2);
    expect(afterRoad.context.stagesByPlayer).toEqual({ '1': STAGES.PLACE_SETTLEMENT });
  });

  it('rolls and resolves a turn without leaking runtime dependencies into search state', () => {
    const state = createMockGameplayState();
    const rollAction = catanGame.getLegalActions(state).find(a => a.move === 'rollDice');
    expect(rollAction).toBeDefined();

    const rolled = catanGame.applyAction(state, rollAction!, new SeededSearchRandom(7));
    expect(rolled.game.rollStatus).toBe(RollStatus.ROLLING);

    const resolveAction = catanGame.getLegalActions(rolled).find(a => a.move === 'resolveRoll');
    expect(resolveAction).toBeDefined();
    const resolved = catanGame.applyAction(rolled, resolveAction!, new SeededSearchRandom(7));

    expect(resolved.game.rollStatus).toBe(RollStatus.RESOLVED);
    expect(resolved.context.currentPlayer).toBe('0');
    expect([STAGES.ACTING, STAGES.ROBBER]).toContain(resolved.context.stagesByPlayer?.['0']);
  });

  it('endTurn advances gameplay lifecycle to the next player', () => {
    const state = createMockGameplayState();
    state.context.stagesByPlayer = { '0': STAGES.ACTING };

    const endTurnAction = catanGame.getLegalActions(state).find(a => a.move === 'endTurn');
    expect(endTurnAction).toBeDefined();

    const nextState = catanGame.applyAction(state, endTurnAction!, new SeededSearchRandom(3));
    expect(nextState.context.currentPlayer).toBe('1');
    expect(nextState.context.turn).toBe(2);
    expect(nextState.context.stagesByPlayer).toEqual({ '1': STAGES.ROLLING });
    expect(nextState.game.rollStatus).toBe(RollStatus.IDLE);
  });

  it('marks the search state game-over when a winning move crosses the terminal threshold', () => {
    const state = createMockGameplayState();
    state.context.stagesByPlayer = { '0': STAGES.ACTING };
    state.game.players['0'].victoryPoints = WINNING_SCORE - 1;
    const vertex = Object.keys(state.game.board.vertices)[0] ?? 'v0';
    state.game.board.vertices[vertex] = { owner: '0', type: 'settlement' };
    state.game.players['0'].settlements = [vertex];

    // A city adds one VP and is therefore a compact terminal-transition fixture.
    state.game.players['0'].resources.ore = 3;
    state.game.players['0'].resources.wheat = 2;
    const action = { move: 'buildCity' as const, args: [vertex] as [string] };
    const nextState = catanGame.applyAction(state, action, new SeededSearchRandom(5));

    expect(nextState.game.players['0'].victoryPoints).toBe(WINNING_SCORE);
    expect(catanGame.getTerminalResult(nextState)).toEqual({ kind: 'winner', winnerId: '0' });
    expect(nextState.context.gameover).toEqual({ winner: '0' });
    expect(nextState.context.phase).toBe(PHASES.GAME_OVER);
    expect(catanGame.getLegalActions(nextState)).toEqual([]);
  });

  it('handles parameterized robber destination and victim choices with resource stealing and deterministic action ordering', () => {
    const { hexes, ports } = generateBoard();
    const hexList = Object.values(hexes);
    const destinationHex = hexList[0];
    const initialRobberHex = hexList[1];
    const targetVertexId = getVerticesForHex(destinationHex.coords)[0];

    const game = createMockGameState({
      board: {
        hexes: {
          [destinationHex.id]: destinationHex,
          [initialRobberHex.id]: initialRobberHex,
        },
        ports,
        vertices: {
          [targetVertexId]: { owner: '1', type: 'settlement' },
        },
        edges: {},
      },
      players: {
        '0': createTestPlayer('0', { resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } }),
        '1': createTestPlayer('1', { resources: { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 }, settlements: [targetVertexId] }),
      },
      robberLocation: initialRobberHex.id,
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
    const legalActions1 = catanGame.getLegalActions(state);
    const legalActions2 = catanGame.getLegalActions(state);

    expect(legalActions1.length).toBeGreaterThan(0);
    expect(legalActions1.every(a => a.move === 'dismissRobber')).toBe(true);
    expect(JSON.stringify(legalActions1)).toBe(JSON.stringify(legalActions2));

    const specificAction = legalActions1.find(
      a => a.move === 'dismissRobber' && a.args[0] === destinationHex.id && a.args[1] === '1'
    );
    expect(specificAction).toBeDefined();

    if (specificAction && specificAction.move === 'dismissRobber') {
      const nextState = catanGame.applyAction(state, specificAction, new SeededSearchRandom(12345));
      expect(nextState.game.robberLocation).toBe(destinationHex.id);
      expect(nextState.context.stagesByPlayer).toEqual({ '0': STAGES.ACTING });
      expect(nextState.game.players['1'].resources.wood).toBe(1);
      expect(nextState.game.players['0'].resources.wood).toBe(1);
      expect(nextState.game.notification).toEqual({
        type: 'robber',
        thief: '0',
        victim: '1',
        resource: 'wood',
      });
    }
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
