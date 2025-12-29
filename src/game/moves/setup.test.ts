import { placeSettlement, placeRoad } from './setup';
import { GameState } from '../types';

describe('Setup Phase Moves', () => {
    let G: GameState;
    let ctx: any;
    let events: any;

    beforeEach(() => {
        G = {
            board: {
                hexes: {},
                vertices: {},
                edges: {},
            },
            players: {
                '0': {
                    id: '0',
                    color: 'red',
                    resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                    settlements: [],
                    roads: [],
                    victoryPoints: 0
                }
            },
            setupPhase: { activeRound: 1, activeSettlement: null },
            setupOrder: ['0'],
            lastRoll: [0, 0],
            boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
            hasRolled: false
        } as unknown as GameState;
        ctx = { currentPlayer: '0', turn: 1 };
        events = { setStage: jest.fn(), endTurn: jest.fn() };
    });

    describe('placeSettlement', () => {
        it('should place settlement and set activeSettlement', () => {
            const vId = "0,0,0::1,-1,0::0,-1,1";
            // @ts-ignore
            placeSettlement({ G, ctx, events }, vId);

            expect(G.board.vertices[vId]).toBeDefined();
            expect(G.setupPhase.activeSettlement).toBe(vId);
            expect(events.setStage).toHaveBeenCalledWith('placeRoad');
        });
    });

    describe('placeRoad', () => {
        it('should allow road connected to activeSettlement', () => {
            const vId = "0,0,0::1,-1,0::0,-1,1";
            G.setupPhase.activeSettlement = vId;

            const validEdge = "0,0,0::1,-1,0";

            // @ts-ignore
            const result = placeRoad({ G, ctx, events }, validEdge);

            expect(result).not.toBe('INVALID_MOVE');
            expect(G.board.edges[validEdge]).toBeDefined();
            expect(G.setupPhase.activeSettlement).toBeNull(); // Should be reset
            expect(events.endTurn).toHaveBeenCalled();
        });

        it('should fail if no activeSettlement set', () => {
            G.setupPhase.activeSettlement = null;
            const validEdge = "0,0,0::1,-1,0";
            // @ts-ignore
            const result = placeRoad({ G, ctx, events }, validEdge);
            expect(result).toBe('INVALID_MOVE');
        });

        it('should fail if road is NOT connected to activeSettlement', () => {
            const vId = "0,0,0::1,-1,0::0,-1,1";
            G.setupPhase.activeSettlement = vId;

            // Pick an edge far away
            const disconnectedEdge = "5,0,-5::5,-1,-4";

            // @ts-ignore
            const result = placeRoad({ G, ctx, events }, disconnectedEdge);

            expect(result).toBe('INVALID_MOVE');
            expect(G.board.edges[disconnectedEdge]).toBeUndefined();
            expect(G.setupPhase.activeSettlement).toBe(vId); // Not reset
        });
    });
});
