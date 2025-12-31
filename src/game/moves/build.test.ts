import { buildRoad, buildSettlement, buildCity } from './build';
import { GameState } from '../types';
import { BUILD_COSTS } from '../config';
import { Ctx } from 'boardgame.io';

type MoveFn = (args: { G: GameState; ctx: Ctx }, ...payload: unknown[]) => unknown;

describe('Gameplay Moves', () => {
    let G: GameState;
    let ctx: { currentPlayer: string };

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
            hasRolled: true
        } as unknown as GameState;
        ctx = { currentPlayer: '0' };
    });

    describe('buildRoad', () => {
        it('should fail if not enough resources', () => {
             // 0 resources
             const call = () => (buildRoad as MoveFn)({ G, ctx } as { G: GameState; ctx: Ctx }, '0,0,0::1,0,-1');
             expect(call).toThrow("Not enough resources to build a road (requires Wood, Brick)");
        });

        it('should build road if resources and connectivity exist', () => {
             // Grant resources
             G.players['0'].resources = {
                 wood: BUILD_COSTS.road.wood,
                 brick: BUILD_COSTS.road.brick,
                 sheep: 0, wheat: 0, ore: 0
             };

             // Setup connectivity (own settlement at one end)
             // Edge 0,0,0::1,-1,0 -> Vertices: 0,0,0::1,-1,0::1,0,-1 and 0,0,0::1,-1,0::0,-1,1
             const vId = "0,-1,1::0,0,0::1,-1,0"; // Realistic ID
             const eId = "0,0,0::1,-1,0";

             G.board.vertices[vId] = { owner: '0', type: 'settlement' };

             const result = (buildRoad as MoveFn)({ G, ctx } as { G: GameState; ctx: Ctx }, eId);

             expect(result).not.toBe('INVALID_MOVE');
             expect(G.board.edges[eId]).toBeDefined();
             expect(G.board.edges[eId].owner).toBe('0');
             expect(G.players['0'].resources.wood).toBe(0);
             expect(G.players['0'].resources.brick).toBe(0);
             expect(G.players['0'].roads).toContain(eId);
        });
    });

    describe('buildSettlement', () => {
         it('should fail if not enough resources', () => {
             const vId = "0,0,0::1,-1,0::0,-1,1";
             const call = () => (buildSettlement as MoveFn)({ G, ctx } as { G: GameState; ctx: Ctx }, vId);
             expect(call).toThrow("Not enough resources to build a settlement (requires Wood, Brick, Wheat, Sheep)");
        });

        it('should deduct resources on success', () => {
            G.players['0'].resources = {
                wood: BUILD_COSTS.settlement.wood,
                brick: BUILD_COSTS.settlement.brick,
                sheep: BUILD_COSTS.settlement.sheep,
                wheat: BUILD_COSTS.settlement.wheat,
                ore: 0
            };

            // Mock connection: own road connected to v1
            const vId = "0,0,0::1,-1,0::0,-1,1";
            // Edge connected to this vertex: 0,0,0::1,-1,0
            const eId = "0,0,0::1,-1,0";
            G.board.edges[eId] = { owner: '0' };

            const result = (buildSettlement as MoveFn)({ G, ctx } as { G: GameState; ctx: Ctx }, vId);

            expect(result).not.toBe('INVALID_MOVE');
            expect(G.board.vertices[vId]).toBeDefined();
            expect(G.board.vertices[vId].owner).toBe('0');
            expect(G.players['0'].victoryPoints).toBe(1);
            expect(G.players['0'].resources.wood).toBe(0);
            expect(G.players['0'].resources.brick).toBe(0);
            expect(G.players['0'].resources.sheep).toBe(0);
            expect(G.players['0'].resources.wheat).toBe(0);
        });
    });

    describe('buildCity', () => {
         it('should fail if not enough resources', () => {
             const vId = "0,0,0::1,-1,0::0,-1,1";
             G.board.vertices[vId] = { owner: '0', type: 'settlement' };
             const call = () => (buildCity as MoveFn)({ G, ctx } as { G: GameState; ctx: Ctx }, vId);
             expect(call).toThrow("Not enough resources to build a city (requires 3 Ore, 2 Wheat)");
        });

        it('should upgrade settlement to city', () => {
             G.players['0'].resources = {
                 wood: 0, brick: 0, sheep: 0,
                 wheat: BUILD_COSTS.city.wheat,
                 ore: BUILD_COSTS.city.ore
             };
             const vId = "0,0,0::1,-1,0::0,-1,1";

             // Pre-condition: User has a settlement there
             G.board.vertices[vId] = { owner: '0', type: 'settlement' };
             G.players['0'].settlements.push(vId);
             G.players['0'].victoryPoints = 1;

             const result = (buildCity as MoveFn)({ G, ctx } as { G: GameState; ctx: Ctx }, vId);

             expect(result).not.toBe('INVALID_MOVE');
             expect(G.board.vertices[vId].type).toBe('city');
             expect(G.players['0'].victoryPoints).toBe(2); // 1 -> 2
             expect(G.players['0'].resources.ore).toBe(0);
             expect(G.players['0'].resources.wheat).toBe(0);
        });
    });
});
