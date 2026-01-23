import { buildRoad, buildSettlement, buildCity } from './build';
import { GameState, TerrainType, Hex } from '../core/types';
import { BUILD_COSTS } from '../core/config';
import { Ctx } from 'boardgame.io';
import { safeSet, safeGet } from '../../game/core/utils/objectUtils';

type MoveFn = (args: { G: GameState; ctx: Ctx }, ...payload: unknown[]) => unknown;

describe('Gameplay Moves', () => {
    let G: GameState;
    let ctx: { currentPlayer: string };

    const mockHexes: [string, Hex][] = [
        ['0,0,0', { id: '0,0,0', coords: {q:0,r:0,s:0}, terrain: TerrainType.Forest, tokenValue: 6 }],
        ['1,-1,0', { id: '1,-1,0', coords: {q:1,r:-1,s:0}, terrain: TerrainType.Fields, tokenValue: 5 }],
        ['0,-1,1', { id: '0,-1,1', coords: {q:0,r:-1,s:1}, terrain: TerrainType.Pasture, tokenValue: 4 }],
        ['1,0,-1', { id: '1,0,-1', coords: {q:1,r:0,s:-1}, terrain: TerrainType.Mountains, tokenValue: 10 }],
    ];

    beforeEach(() => {
        G = {
            board: {
                hexes: Object.fromEntries(mockHexes),
                vertices: {},
                edges: {},
                ports: {},
            },
            players: {
                '0': {
                    id: '0',
                    name: 'P1',
                    color: 'red',
                    resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                    settlements: [],
                    roads: [],
                    victoryPoints: 0
                }
            },
            // Simplified state for these tests
        } as unknown as GameState;
        ctx = { currentPlayer: '0' };
    });

    describe('buildRoad', () => {
        it('should fail if not enough resources', () => {
             const call = () => (buildRoad as MoveFn)({ G, ctx } as { G: GameState; ctx: Ctx }, '0,0,0::1,0,-1');
             expect(call).toThrow("Not enough resources to build a road");
        });

        it('should build road if resources and connectivity exist', () => {
             G.players['0'].resources = { ...BUILD_COSTS.road, sheep: 0, wheat: 0, ore: 0 };

             const vId = "0,-1,1::0,0,0::1,-1,0";
             const eId = "0,0,0::1,-1,0";

             safeSet(G.board.vertices, vId, { owner: '0', type: 'settlement' });

             (buildRoad as MoveFn)({ G, ctx } as { G: GameState; ctx: Ctx }, eId);

             expect(safeGet(G.board.edges, eId)).toBeDefined();
             expect(safeGet(G.board.edges, eId)).toBeDefined();
             expect(safeGet(G.board.edges, eId)?.owner).toBe('0');
             expect(G.players['0'].resources.brick).toBe(0);
             expect(G.players['0'].roads).toContain(eId);
        });
    });

    describe('buildSettlement', () => {
         it('should fail if not enough resources', () => {
             const vId = "0,0,0::1,-1,0::0,-1,1";
             const call = () => (buildSettlement as MoveFn)({ G, ctx } as { G: GameState; ctx: Ctx }, vId);
             expect(call).toThrow("Not enough resources to build a settlement");
        });

        it('should deduct resources on success', () => {
            G.players['0'].resources = { ...BUILD_COSTS.settlement, ore: 0 };

            const vId = "0,0,0::1,-1,0::0,-1,1";
            const eId = "0,0,0::1,-1,0";
            safeSet(G.board.edges, eId, { owner: '0' });

            (buildSettlement as MoveFn)({ G, ctx } as { G: GameState; ctx: Ctx }, vId);

            expect(safeGet(G.board.vertices, vId)).toBeDefined();
            expect(safeGet(G.board.vertices, vId)?.owner).toBe('0');
            expect(G.players['0'].victoryPoints).toBe(1);
            expect(G.players['0'].resources.wood).toBe(0);
        });
    });

    describe('buildCity', () => {
         it('should fail if not enough resources', () => {
             const vId = "0,0,0::1,-1,0::0,-1,1";
             safeSet(G.board.vertices, vId, { owner: '0', type: 'settlement' });
             const call = () => (buildCity as MoveFn)({ G, ctx } as { G: GameState; ctx: Ctx }, vId);
             expect(call).toThrow("Not enough resources to build a city");
        });

        it('should upgrade settlement to city', () => {
             G.players['0'].resources = { wood: 0, brick: 0, sheep: 0, ...BUILD_COSTS.city };
             const vId = "0,0,0::1,-1,0::0,-1,1";

             safeSet(G.board.vertices, vId, { owner: '0', type: 'settlement' });
             G.players['0'].settlements.push(vId);
             G.players['0'].victoryPoints = 1;

             (buildCity as MoveFn)({ G, ctx } as { G: GameState; ctx: Ctx }, vId);

             expect(safeGet(G.board.vertices, vId)?.type).toBe('city');
             expect(G.players['0'].victoryPoints).toBe(2);
             expect(G.players['0'].resources.ore).toBe(0);
        });
    });
});
