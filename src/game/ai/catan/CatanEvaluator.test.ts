import {
  CatanEvaluator,
  evaluateVictoryPoints,
  evaluateProductionPips,
  evaluateResourceDiversity,
  evaluateResourceSynergy,
  evaluateStructures,
  evaluateRoadExpansion,
  evaluateSettlementOpportunities,
  evaluatePortAccess,
} from './CatanEvaluator';
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

  describe('Weight Validation', () => {
    it('rejects NaN weight', () => {
      expect(() => new CatanEvaluator({ victoryPoints: NaN })).toThrow('Invalid evaluator weight');
    });

    it('rejects Infinity weight', () => {
      expect(() => new CatanEvaluator({ productionPips: Infinity })).toThrow('Invalid evaluator weight');
    });

    it('rejects -Infinity weight', () => {
      expect(() => new CatanEvaluator({ cities: -Infinity })).toThrow('Invalid evaluator weight');
    });
  });

  describe('Terminal and Bounded Evaluation', () => {
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
  });

  describe('Directional Signals', () => {
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
      stateShortRoad.game.players['0'].roads = ['0,0,0::0,1,-1'];

      const stateLongRoad = createBaseState();
      stateLongRoad.game.players['0'].roads = ['0,0,0::0,1,-1', '0,0,0::1,0,-1', '0,0,0::1,-1,0', '0,0,0::0,-1,1'];

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

  describe('Player-Specific Settlement Opportunities', () => {
    it('changing player 0 settlement opportunities changes player 0 score without affecting player 1 score', () => {
      const stateInitial = createBaseState();
      stateInitial.context.phase = PHASES.GAMEPLAY;

      const utilInitial = evaluator.evaluate(searchGame, stateInitial, false);

      // Give player 0 a road connecting to an open vertex
      const statePlayer0Road = createBaseState();
      statePlayer0Road.context.phase = PHASES.GAMEPLAY;
      const edgeKey = '0,0,0::0,1,-1';
      statePlayer0Road.game.board.edges[edgeKey] = { owner: '0' };
      statePlayer0Road.game.players['0'].roads.push(edgeKey);

      const utilPlayer0Road = evaluator.evaluate(searchGame, statePlayer0Road, false);

      // Player 0's score must increase due to new settlement opportunities
      expect(utilPlayer0Road['0']).toBeGreaterThan(utilInitial['0']);
      // Player 1's score must remain unchanged
      expect(utilPlayer0Road['1']).toBe(utilInitial['1']);
    });
  });

  describe('Extracted Signal Unit Tests', () => {
    it('evaluates VP signal directly', () => {
      const state = createBaseState();
      state.game.players['0'].victoryPoints = 4;
      expect(evaluateVictoryPoints(state, '0')).toBe(4);
    });

    it('evaluates production pips signal directly', () => {
      const pips = { wood: 5, brick: 3, ore: 0 };
      expect(evaluateProductionPips(pips)).toBe(8);
    });

    it('evaluates resource diversity signal directly', () => {
      expect(evaluateResourceDiversity({ wood: 1, brick: 2, sheep: 3, wheat: 1 })).toBe(1.0);
      expect(evaluateResourceDiversity({ wood: 1, brick: 2, sheep: 3 })).toBe(0.5);
      expect(evaluateResourceDiversity({ wood: 1, brick: 2 })).toBe(0.0);
    });

    it('evaluates resource synergies signal directly', () => {
      expect(evaluateResourceSynergy({ ore: 2, wheat: 3 })).toEqual({ oreWheat: 1.0, woodBrick: 0.0 });
      expect(evaluateResourceSynergy({ wood: 1, brick: 1 })).toEqual({ oreWheat: 0.0, woodBrick: 1.0 });
    });

    it('evaluates structure counts signal directly', () => {
      const state = createBaseState();
      state.game.board.vertices['v1'] = { owner: '0', type: 'settlement' };
      state.game.board.vertices['v2'] = { owner: '0', type: 'city' };
      state.game.players['0'].settlements = ['v1', 'v2'];

      const structures = evaluateStructures(state, '0');
      expect(structures.settlementCount).toBe(1);
      expect(structures.cityCount).toBe(1);
    });

    it('evaluates road expansion signal directly', () => {
      const state = createBaseState();
      state.game.players['0'].roads = ['0,0,0::0,1,-1', '0,0,0::1,0,-1'];
      expect(evaluateRoadExpansion(state, '0')).toBe(2);
    });

    it('evaluates settlement opportunities signal directly', () => {
      const state = createBaseState();
      state.context.phase = PHASES.SETUP;
      state.context.currentPlayer = '0';
      const spots0 = evaluateSettlementOpportunities(state, '0');
      const spots1 = evaluateSettlementOpportunities(state, '1');

      expect(spots0).toBeGreaterThan(0);
      expect(spots1).toBe(0); // Player 1 is not current setup player
    });

    it('evaluates port access signal directly', () => {
      const state = createBaseState();
      state.game.board.vertices['v_p'] = { owner: '0', type: 'settlement' };
      state.game.players['0'].settlements = ['v_p'];
      state.game.board.ports = {
        p1: { type: '3:1', edgeId: 'e1', vertices: ['v_p', 'v_other'] },
      };

      expect(evaluatePortAccess(state, '0')).toBe(1);
      expect(evaluatePortAccess(state, '1')).toBe(0);
    });
  });
});
