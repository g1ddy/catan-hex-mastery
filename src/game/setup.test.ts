/**
 * @jest-environment jsdom
 */
import { CatanGame } from './Game';
import { Client } from 'boardgame.io/client';
import { getSnakeDraftOrder } from './turnOrder';
import { TerrainType } from './types';

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
    const hexes = G.board.hexes;
    const robberHex = hexes[robberHexId];
    expect(robberHex).toBeDefined();
    expect(robberHex.terrain).toBe(TerrainType.Desert);
    expect(robberHex.tokenValue).toBeNull();
  });

  test('Snake draft order is correct', () => {
    const order = getSnakeDraftOrder(4);
    expect(order).toEqual(['0', '1', '2', '3', '3', '2', '1', '0']);

    // Check game turn order
    // In boardgame.io client simulation, we can check ctx.playOrder if we could inspect it,
    // but here we can just verify the function directly or simulate turns.
  });

  test('Cannot place settlement on top of another', () => {
    // Get a valid vertex from the board
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { G: _G } = client.store.getState();
    // Just pick a random vertex ID that would exist.
    // We can rely on hexUtils to construct one or iterate generated hexes.
    // Let's generate one from the center hex 0,0,0 and its neighbors.
    // 0,0,0 neighbors: 1,-1,0 and 1,0,-1
    // Vertex: 0,0,0::1,-1,0::1,0,-1 (sorted string)
    // Actually, let's just grab a hex from G.board.hexes
    // const _hexId = Object.keys(G.board.hexes)[0]; // e.g., '0,0,0'
    // This isn't a vertex ID.
    // We need a valid vertex ID.
    // We can import `getVerticesForHex` but it's in src.
    // Let's use a known coordinate for 0,0,0.
    // 0,0,0 neighbors:
    // q=1,r=-1,s=0
    // q=1,r=0,s=-1
    // Vertex ID: "0,0,0::1,-1,0::1,0,-1" (sorted alphabetically/numerically)
    // q=0 vs q=1. 0 comes first.
    // "0,0,0::1,-1,0::1,0,-1"

    // Wait, the sorting in `hexUtils` is:
    // if (a.q !== b.q) return a.q - b.q;
    // if (a.r !== b.r) return a.r - b.r;
    // return a.s - b.s;

    // 0,0,0
    // 1,-1,0
    // 1,0,-1
    // Order:
    // 0,0,0
    // 1,-1,0 (q=1, r=-1)
    // 1,0,-1 (q=1, r=0)

    const vId = "0,0,0::1,-1,0::1,0,-1";

    // Player 0 places settlement
    client.moves.placeSettlement(vId);
    let state = client.store.getState();
    expect(state.G.board.vertices[vId]).toBeDefined();
    expect(state.G.board.vertices[vId].owner).toBe('0');

    // To test occupancy, we need to advance to another player and try to place on occupied spot.
    // P0 places road to end turn.
    // Find an edge connected to vId.
    // Edge: "0,0,0::1,-1,0"
    const eId = "0,0,0::1,-1,0";
    client.moves.placeRoad(eId);

    // Now P1's turn.
    state = client.store.getState();
    expect(state.ctx.currentPlayer).toBe('1');

    // P1 tries to place on vId (occupied by P0)
    // Expect specific error message for occupied vertex
    expect(() => client.moves.placeSettlement(vId)).toThrow("This vertex is already occupied");

    // Verify it failed. P1 should still be 'placeSettlement' and currentPlayer should still be '1' (or move returned invalid).
    state = client.store.getState();
    expect(state.G.players['1'].settlements).toHaveLength(0);
  });

  test('Distance rule', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { G: _G } = client.store.getState();
      // P0 places at v1
      const v1 = "0,0,0::1,-1,0::1,0,-1";
      client.moves.placeSettlement(v1);

      // P0 places road
      client.moves.placeRoad("0,0,0::1,-1,0");

      // P1's turn.
      // Valid v1 neighbors.
      // v1 is (H0, H1, H2).
      // Neighbor n1 is shared by (H0, H1) and some H3.
      // H0=0,0,0. H1=1,-1,0.
      // Neighbor of H0,H1 is formed by H0,H1 and...
      // H0 neighbors: include 0,-1,1.
      // H1 neighbors: include 0,-1,1?
      // 1,-1,0 + (-1,0,1) = 0,-1,1. Yes.
      // So n1 = (0,0,0::0,-1,1::1,-1,0).
      // Let's sort:
      // 0,-1,1 (q=0, r=-1) -> First
      // 0,0,0 (q=0, r=0) -> Second
      // 1,-1,0 (q=1) -> Third

      const vNeighbor = "0,-1,1::0,0,0::1,-1,0";

      // Expect specific error message for distance rule
      expect(() => client.moves.placeSettlement(vNeighbor)).toThrow("Settlement is too close to another building");

      const state = client.store.getState();

      // Should fail due to distance rule
      expect(state.G.players['1'].settlements).toHaveLength(0);
  });
});
