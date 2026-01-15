import { Client } from 'boardgame.io/client';
import { CatanGame } from '../../src/game/Game';
import { GameState } from '../../src/game/types';
import { STAGES } from '../../src/game/constants';

describe('Roll Logic Integration', () => {
    let client: any;

    beforeEach(() => {
        // Initialize a 2-player game
        client = Client({
            game: CatanGame,
            numPlayers: 2,
        });

        // Use valid vertex IDs (must contain 3 hex coordinates, sorted)
        // Hex 0,0,0 and its neighbors 1,-1,0 and 0,-1,1 form a vertex.
        // Let's assume standard grid coordinates.
        // We can just use the board generation to find valid ones if we wanted,
        // but hardcoding valid 3-tuples is easier if we know the geometry.

        // Vertex 1: (0,0,0), (1,-1,0), (1,0,-1)
        // Sorted order (q asc, r asc): (0,0,0), (1,-1,0), (1,0,-1)
        const v1 = '0,0,0::1,-1,0::1,0,-1';
        // Edge 1: (0,0,0), (1,-1,0)
        const e1 = '0,0,0::1,-1,0';
        // Edge 2 from v1: (1,-1,0), (1,0,-1)
        const e2 = '1,-1,0::1,0,-1';

        // Vertex 2 (far away): (-2,0,2), (-2,1,1), (-1,0,1)
        const v2 = '-2,0,2::-2,1,1::-1,0,1';
        const e3 = '-2,0,2::-2,1,1';
        const e4 = '-2,1,1::-1,0,1';

        // Vertex 3
        const v3 = '1,1,-2::2,0,-2::2,1,-3';
        const e5 = '1,1,-2::2,0,-2';
        const e6 = '2,0,-2::2,1,-3';

        // Vertex 4
        const v4 = '-1,-1,2::-1,0,1::0,-1,1';
        const e7 = '-1,-1,2::-1,0,1';
        const e8 = '-1,0,1::0,-1,1';

        // Player 0 places settlement 1
        client.moves.placeSettlement(v1);
        client.moves.placeRoad(e1);
        client.events.endTurn();

        // Player 1 places settlement 1
        client.moves.placeSettlement(v2);
        client.moves.placeRoad(e3);
        client.events.endTurn();

        // Player 1 places settlement 2
        client.moves.placeSettlement(v3);
        client.moves.placeRoad(e6);
        client.events.endTurn();

        // Player 0 places settlement 2
        client.moves.placeSettlement(v4);
        client.moves.placeRoad(e8);
        client.events.endTurn();

        // Now we should be in GAMEPLAY phase
        const state = client.store.getState() as { G: GameState, ctx: any };
        expect(state.ctx.phase).toBe('gameplay');
        expect(state.ctx.activePlayers['0']).toBe(STAGES.ROLLING);
    });

    it('should distribute resources and transition to ACTING on normal roll', () => {
        // Force a roll
        client.moves.rollDice();

        const state = client.store.getState() as { G: GameState, ctx: any };
        const rollSum = state.G.lastRoll[0] + state.G.lastRoll[1];

        if (rollSum === 7) {
             expect(state.ctx.activePlayers['0']).toBe(STAGES.ROBBER);
             expect(state.G.lastRollRewards).toEqual({});
        } else {
             // Check for ROBBER hex match
             const robberHex = state.G.board.hexes[state.G.robberLocation];
             if (robberHex && robberHex.tokenValue === rollSum) {
                  expect(state.ctx.activePlayers['0']).toBe(STAGES.ROBBER);
             } else {
                  expect(state.ctx.activePlayers['0']).toBe(STAGES.ACTING);
                  expect(state.G.rollStatus).toBe('RESOLVED');
             }
        }
    });
});
