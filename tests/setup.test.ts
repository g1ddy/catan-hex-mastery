import { CatanGame } from '../src/game/Game';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';

describe('Setup Phase Logic (Multiplayer)', () => {
  let p0: ReturnType<typeof Client>;
  let p1: ReturnType<typeof Client>;

  beforeEach(() => {
    // Connect both clients to the same local game instance
    const multiplayer = Local();

    p0 = Client({
      game: CatanGame,
      numPlayers: 2,
      playerID: '0',
      multiplayer,
    });
    p1 = Client({
      game: CatanGame,
      numPlayers: 2,
      playerID: '1',
      multiplayer,
    });

    p0.start();
    p1.start();
  });

  afterEach(() => {
      p0.stop();
      p1.stop();
  });

  test('Setup creates players', () => {
    const { G } = p0.store.getState();
    expect(Object.keys(G.players)).toHaveLength(2);
    expect(G.players['0'].color).toBeDefined();
    expect(G.setupOrder).toBeDefined();
  });

  test('Active player enforcement', () => {
    const vId = "0,0,0::1,-1,0::1,0,-1";

    // P1 tries to move out of turn.
    // Framework detects this and logs error, but does not throw in this config.
    p1.moves.placeSettlement(vId);

    let state = p0.store.getState();
    expect(state.G.board.vertices[vId]).toBeUndefined(); // Move ignored
    expect(state.ctx.currentPlayer).toBe('0'); // Still P0's turn
  });

  test('Cannot place settlement on top of another', () => {
    const vId = "0,0,0::1,-1,0::1,0,-1";

    // P0 places settlement
    p0.moves.placeSettlement(vId);

    // P0 places road to end turn
    const eId = "0,0,0::1,-1,0";
    p0.moves.placeRoad(eId);

    // P1 tries to place on occupied vId
    expect(() => p1.moves.placeSettlement(vId)).toThrow("This vertex is already occupied");

    const state = p1.store.getState();
    expect(state.G.players['1'].settlements).toHaveLength(0); // Move failed
    expect(state.ctx.currentPlayer).toBe('1'); // Still P1's turn
  });

  test('Distance rule', () => {
      // DEBUG: Verify clean state
      let state = p0.store.getState();
      // console.log('Distance rule START - Player:', state.ctx.currentPlayer);

      const v1 = "0,0,0::1,-1,0::1,0,-1";
      p0.moves.placeSettlement(v1);
      p0.moves.placeRoad("0,0,0::1,-1,0");

      // P1's turn
      // Try to place too close
      const vNeighbor = "0,-1,1::0,0,0::1,-1,0";

      expect(() => p1.moves.placeSettlement(vNeighbor)).toThrow("Settlement is too close to another building");

      state = p1.store.getState();
      expect(state.G.players['1'].settlements).toHaveLength(0); // Move failed
  });
});
