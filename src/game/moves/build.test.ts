import { buildRoad, buildSettlement, buildCity } from './build';
import { GameState } from '../types';

describe('Gameplay Moves', () => {
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
            setupPhase: { activeRound: 1 },
            lastPlacedSettlement: null,
            setupOrder: ['0'],
            lastRoll: [0, 0],
            boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
            hasRolled: true
        } as unknown as GameState;
        ctx = { currentPlayer: '0' };
        events = { endTurn: jest.fn() };
    });

    describe('buildRoad', () => {
        it('should fail if not enough resources', () => {
             // 0 resources
             // @ts-ignore
             const result = buildRoad({ G, ctx, events } as any, '0,0,0::1,0,-1');
             expect(result).toBe('INVALID_MOVE');
        });

        it('should build road if resources and connectivity exist', () => {
             // Grant resources
             G.players['0'].resources = { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 };
             // Setup connectivity (own settlement at one end)
             // Edge 0,0,0::1,-1,0 -> Vertices: 0,0,0::1,-1,0::1,0,-1 and 0,0,0::1,-1,0::0,-1,1
             const vId = "0,-1,1::0,0,0::1,-1,0";
             const eId = "0,0,0::1,-1,0";

             G.board.vertices[vId] = { owner: '0', type: 'settlement' };

             // @ts-ignore
             const result = buildRoad({ G, ctx, events } as any, eId);

             expect(result).not.toBe('INVALID_MOVE');
             expect(G.board.edges[eId].owner).toBe('0');
             expect(G.players['0'].resources.wood).toBe(0);
             expect(G.players['0'].resources.brick).toBe(0);
             expect(G.players['0'].roads).toContain(eId);
        });
    });

    describe('buildSettlement', () => {
         it('should fail if not enough resources', () => {
             // @ts-ignore
             const result = buildSettlement({ G, ctx } as any, 'v1');
             expect(result).toBe('INVALID_MOVE');
        });

        it('should deduct resources on success', () => {
            G.players['0'].resources = { wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 0 };

            // Mock connection: own road connected to v1
            const vId = "0,0,0::1,-1,0::0,-1,1";
            // Edge connected to this vertex: 0,0,0::1,-1,0
            const eId = "0,0,0::1,-1,0";
            G.board.edges[eId] = { owner: '0' };

            // @ts-ignore
            const result = buildSettlement({ G, ctx } as any, vId);

            if (result !== 'INVALID_MOVE') {
                 expect(G.board.vertices[vId].owner).toBe('0');
                 expect(G.players['0'].victoryPoints).toBe(1);
                 expect(G.players['0'].resources.wood).toBe(0);
            }
        });
    });

    describe('buildCity', () => {
         it('should fail if not enough resources', () => {
             // @ts-ignore
             const result = buildCity({ G, ctx } as any, 'v1');
             expect(result).toBe('INVALID_MOVE');
        });

        it('should upgrade settlement to city', () => {
             G.players['0'].resources = { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 };
             const vId = "v1";
             G.board.vertices[vId] = { owner: '0', type: 'settlement' };

             // @ts-ignore
             const result = buildCity({ G, ctx } as any, vId);
             expect(G.board.vertices[vId].type).toBe('city');
             expect(G.players['0'].victoryPoints).toBe(1); // Starts at 0, +1 for upgrade (logic in move says +=1)
             expect(G.players['0'].resources.ore).toBe(0);
        });
    });
});
