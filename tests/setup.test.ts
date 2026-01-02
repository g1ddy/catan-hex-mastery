import { CatanGame } from '../src/game/Game';
import { Client } from 'boardgame.io/client';
import { getSnakeDraftOrder } from '../src/game/turnOrder';

describe('Setup Phase Logic', () => {
  let client: ReturnType<typeof Client>;

  beforeEach(() => {
    client = Client({
      game: CatanGame,
      numPlayers: 4,
    });
    client.start();
  });

  test('Setup creates 4 players', () => {
    const { G } = client.store.getState();
    expect(Object.keys(G.players)).toHaveLength(4);
    expect(G.players['0'].color).toBeDefined();
    // G.setupPhase no longer exists
    expect(G.setupOrder).toBeDefined();
  });

  test('Snake draft order is correct', () => {
    const order = getSnakeDraftOrder(4);
    expect(order).toEqual(['0', '1', '2', '3', '3', '2', '1', '0']);
  });

  test('Cannot place settlement on top of another', () => {
    const vId = "0,0,0::1,-1,0::1,0,-1";

    // Player 0 places settlement
    client.moves.placeSettlement(vId);
    let state = client.store.getState();
    expect(state.G.board.vertices[vId]).toBeDefined();
    expect(state.G.board.vertices[vId].owner).toBe('0');

    // Force invalid move (occupancy) from OTHER player
    // First, P0 needs to end turn. They have 1 S, 0 R. Must place R.
    const eId = "0,0,0::1,-1,0";
    client.moves.placeRoad(eId);

    // Now P1's turn
    state = client.store.getState();
    expect(state.ctx.currentPlayer).toBe('1');

    // P1 tries to place on occupied vId
    expect(() => client.moves.placeSettlement(vId)).toThrow("This vertex is already occupied");
  });

  test('Distance rule', () => {
      const v1 = "0,0,0::1,-1,0::1,0,-1";
      client.moves.placeSettlement(v1);
      client.moves.placeRoad("0,0,0::1,-1,0");

      // P1's turn
      const vNeighbor = "0,-1,1::0,0,0::1,-1,0";

      // Expect specific error message for distance rule
      expect(() => client.moves.placeSettlement(vNeighbor)).toThrow("Settlement is too close to another building");
  });
});
