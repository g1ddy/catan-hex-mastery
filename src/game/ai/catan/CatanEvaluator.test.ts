import { CatanEvaluator } from './CatanEvaluator';
import { CatanSearchGame } from './CatanSearchGame';
import type { CatanSearchState } from './CatanSearchState';
import { createMockGameState, createTestPlayer } from '../../testUtils';
import { GameContext, TerrainType } from '../../core/types';
import { PHASES, STAGES } from '../../core/constants';
import { generateBoard } from '../../generation/boardGen';

function createBaseState(): CatanSearchState {
  const { hexes, ports } = generateBoard();
  const desertHex = Object.values(hexes).find((h) => h.terrain === TerrainType.Desert);

  const game = createMockGameState({
    board: { hexes, ports, vertices: {}, edges: {} },
    players: {
      '0': createTestPlayer('0', { victoryPoints: 2, settlements: [], roads: [] }),
      '1': createTestPlayer('1', { victoryPoints: 2, settlements: [], roads: [] }),
    },
    robberLocation: desertHex?.id || '0',
  });

  const context: GameContext = {
    currentPlayer: '0',
    turn: 1,
    phase: PHASES.GAMEPLAY,
    stagesByPlayer: { '0': STAGES.ACTING },
    numPlayers: 2,
    gameover: null,
  };

  return { game, context };
}

describe('CatanEvaluator', () => {
  let searchGame: CatanSearchGame;
  let evaluator: CatanEvaluator;

  beforeEach(() => {
    searchGame = new CatanSearchGame();
    evaluator = new CatanEvaluator();
  });

  it('evaluates terminal state with a winner explicitly (1.0 for winner, 0.0 for others)', () => {
    const state = createBaseState();
    state.context.gameover = { winner: '0' };

    const utility = evaluator.evaluate(searchGame, state, true);
    expect(utility['0']).toBe(1.0);
    expect(utility['1']).toBe(0.0);
  });

  it('evaluates terminal state with a draw explicitly (0.5 for all players)', () => {
    const state = createBaseState();
    state.context.gameover = { draw: true };

    const utility = evaluator.evaluate(searchGame, state, true);
    expect(utility['0']).toBe(0.5);
    expect(utility['1']).toBe(0.5);
  });

  it('produces bounded values in [0, 1] for non-terminal states', () => {
    const state = createBaseState();
    const utility = evaluator.evaluate(searchGame, state, false);

    expect(utility['0']).toBeGreaterThanOrEqual(0.0);
    expect(utility['0']).toBeLessThan(1.0);
    expect(utility['1']).toBeGreaterThanOrEqual(0.0);
    expect(utility['1']).toBeLessThan(1.0);
  });

  it('increases utility as victory points / game progress increases', () => {
    const stateLow = createBaseState();
    stateLow.game.players['0'].victoryPoints = 2;

    const stateHigh = createBaseState();
    stateHigh.game.players['0'].victoryPoints = 5;

    const utilityLow = evaluator.evaluate(searchGame, stateLow, false);
    const utilityHigh = evaluator.evaluate(searchGame, stateHigh, false);

    expect(utilityHigh['0']).toBeGreaterThan(utilityLow['0']);
  });

  it('increases utility with stronger expected resource production (pips)', () => {
    const stateNoHexes = createBaseState();

    const stateWithPips = createBaseState();

    const validHexId = Object.keys(stateWithPips.game.board.hexes)[0];
    if (validHexId) {
      const hex = stateWithPips.game.board.hexes[validHexId];
      hex.terrain = TerrainType.Forest; // Wood
      hex.tokenValue = 8;
      // Add a vertex attached to this hex
      const vId = `${validHexId}__v0`;
      stateWithPips.game.board.vertices[vId] = {
        owner: '0',
        type: 'settlement',
      };
      stateWithPips.game.players['0'].settlements.push(vId);
    }

    const utilityNoPips = evaluator.evaluate(searchGame, stateNoHexes, false);
    const utilityPips = evaluator.evaluate(searchGame, stateWithPips, false);

    expect(utilityPips['0']).toBeGreaterThan(utilityNoPips['0']);
  });

  it('rewards city development over settlement development', () => {
    const stateSettlement = createBaseState();
    const vId = 'v_test_1';
    stateSettlement.game.board.vertices[vId] = { owner: '0', type: 'settlement' };
    stateSettlement.game.players['0'].settlements.push(vId);

    const stateCity = createBaseState();
    stateCity.game.board.vertices[vId] = { owner: '0', type: 'city' };
    stateCity.game.players['0'].settlements.push(vId);

    const utilitySettlement = evaluator.evaluate(searchGame, stateSettlement, false);
    const utilityCity = evaluator.evaluate(searchGame, stateCity, false);

    expect(utilityCity['0']).toBeGreaterThan(utilitySettlement['0']);
  });

  it('rewards longer road network / expansion position', () => {
    const stateShortRoad = createBaseState();
    stateShortRoad.game.players['0'].roads = ['e1'];

    const stateLongRoad = createBaseState();
    stateLongRoad.game.players['0'].roads = ['e1', 'e2', 'e3', 'e4'];

    const utilShort = evaluator.evaluate(searchGame, stateShortRoad, false);
    const utilLong = evaluator.evaluate(searchGame, stateLongRoad, false);

    expect(utilLong['0']).toBeGreaterThan(utilShort['0']);
  });

  it('rewards port access', () => {
    const stateNoPort = createBaseState();

    const statePort = createBaseState();
    const vId = 'v_port_1';
    statePort.game.board.vertices[vId] = { owner: '0', type: 'settlement' };
    statePort.game.players['0'].settlements.push(vId);
    statePort.game.board.ports = {
      p1: { type: '3:1', edgeId: 'e_port_1', vertices: [vId, 'v_port_2'] },
    };

    const utilNoPort = evaluator.evaluate(searchGame, stateNoPort, false);
    const utilPort = evaluator.evaluate(searchGame, statePort, false);

    expect(utilPort['0']).toBeGreaterThan(utilNoPort['0']);
  });
});
