/**
 * @jest-environment jsdom
 */
import { CatanGame } from './Game';
import { Client } from 'boardgame.io/client';
import { getSnakeDraftOrder } from './turnOrder';
import { TerrainType, Hex, Vertex } from './types';
import { safeGet } from '../utils/objectUtils';

describe('Setup Phase Logic', () => {
  let client: ReturnType<typeof Client>;

  beforeEach(() => {
    client = Client({
      game: CatanGame,
      numPlayers: 4,
      debug: false,
    });
    client.start();
  });

  test('Setup creates 4 players', () => {
    const { G } = client.store.getState();
    expect(Object.keys(G.players)).toHaveLength(4);
    expect(G.players['0'].color).toBeDefined();
    expect(G.setupPhase.activeRound).toBe(1);
  });

  test('Robber starts on the desert', () => {
    const { G } = client.store.getState();
    const robberHexId = G.robberLocation;
    const robberHex = safeGet<Hex>(G.board.hexes, robberHexId);
    expect(robberHex).toBeDefined();
    if (robberHex) {
        expect(robberHex.terrain).toBe(TerrainType.Desert);
        expect(robberHex.tokenValue).toBeNull();
    }
  });

  test('Snake draft order is correct', () => {
    const order = getSnakeDraftOrder(4);
    expect(order).toEqual(['0', '1', '2', '3', '3', '2', '1', '0']);
  });

  test('Cannot place settlement on top of another', () => {
    const vId = "0,0,0::1,-1,0::1,0,-1";
    client.moves.placeSettlement(vId);
    let state = client.store.getState();
    const vertex = safeGet<Vertex>(state.G.board.vertices, vId);
    expect(vertex).toBeDefined();
    if (vertex) {
        expect(vertex.owner).toBe('0');
    }

    const eId = "0,0,0::1,-1,0";
    client.moves.placeRoad(eId);

    state = client.store.getState();
    expect(state.ctx.currentPlayer).toBe('1');

    expect(() => client.moves.placeSettlement(vId)).toThrow("This vertex is already occupied");

    state = client.store.getState();
    expect(state.G.players['1'].settlements).toHaveLength(0);
  });

  test('Distance rule', () => {
      const v1 = "0,0,0::1,-1,0::1,0,-1";
      client.moves.placeSettlement(v1);
      client.moves.placeRoad("0,0,0::1,-1,0");

      const vNeighbor = "0,-1,1::0,0,0::1,-1,0";

      expect(() => client.moves.placeSettlement(vNeighbor)).toThrow("Settlement is too close to another building");

      const state = client.store.getState();
      expect(state.G.players['1'].settlements).toHaveLength(0);
  });
});
