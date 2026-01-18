/**
 * @jest-environment jsdom
 */
import { Client } from 'boardgame.io/client';
import { CatanGame } from '../../src/game/Game';
import { getVertexId, getEdgeId } from '../../src/game/hexUtils';
import { PHASES, STAGES } from '../../src/game/constants';

describe('Game Integration', () => {
    it('should complete setup phase and transition to gameplay phase without infinite loop', () => {
        // Initialize client for 2 players
        const client = Client({
            game: CatanGame,
            numPlayers: 2,
            debug: false,
        });

        client.start();

        const makeMove = (playerID: string, moveName: string, ...args: unknown[]) => {
             const state = client.getState();
             if (state.ctx.currentPlayer !== playerID) {
                 throw new Error(`Expected current player ${playerID}, got ${state.ctx.currentPlayer}`);
             }
             client.moves[moveName](...args);
        };

        // Vertices for P0
        const v1 = getVertexId({q:0, r:0, s:0}, {q:1, r:-1, s:0}, {q:0, r:-1, s:1});
        const e1 = getEdgeId({q:0, r:0, s:0}, {q:1, r:-1, s:0});

        // P0: Place Settlement
        makeMove('0', 'placeSettlement', v1);
        // P0: Place Road
        makeMove('0', 'placeRoad', e1);

        // --- P1 Turn 1 ---
        // V2 far away: (0, 2, -2)
        const v2 = getVertexId({q:0, r:2, s:-2}, {q:1, r:1, s:-2}, {q:0, r:1, s:-1});
        const e2 = getEdgeId({q:0, r:2, s:-2}, {q:1, r:1, s:-2});

        makeMove('1', 'placeSettlement', v2);
        makeMove('1', 'placeRoad', e2);

        // --- P1 Turn 2 (Snake Draft) ---
        // V3: (-2, 0, 2)
        const v3 = getVertexId({q:-2, r:0, s:2}, {q:-1, r:-1, s:2}, {q:-1, r:0, s:1});
        const e3 = getEdgeId({q:-2, r:0, s:2}, {q:-1, r:-1, s:2});

        makeMove('1', 'placeSettlement', v3);
        makeMove('1', 'placeRoad', e3);

        // --- P0 Turn 2 (Snake Draft) ---
        // V4: (2, 0, -2)
        const v4 = getVertexId({q:2, r:0, s:-2}, {q:1, r:1, s:-2}, {q:2, r:-1, s:-1});
        const e4 = getEdgeId({q:2, r:0, s:-2}, {q:1, r:1, s:-2});

        makeMove('0', 'placeSettlement', v4);

        // THE CRITICAL MOVE
        makeMove('0', 'placeRoad', e4);

        // Verify state
        const finalState = client.getState();
        expect(finalState.ctx.phase).toBe(PHASES.GAMEPLAY);
        // Should start in rolling stage
        const activeStage = finalState.ctx.activePlayers?.[finalState.ctx.currentPlayer];
        expect(activeStage).toBe(STAGES.ROLLING);
        expect(finalState.ctx.turn).toBe(5);
    });
});
