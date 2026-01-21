import { buildRoad, buildSettlement, buildCity } from './build';
import { GameState, RollStatus, TerrainType, Hex } from '../types';
import { Ctx } from 'boardgame.io';
import * as _ from 'lodash';

type MoveFn = (args: { G: GameState; ctx: Ctx }, ...payload: unknown[]) => unknown;

describe('Unit Test: Resource Costs', () => {
    const mockContext: Ctx = { currentPlayer: '0' } as Ctx;
    const validEdgeId = "0,0,0::1,-1,0"; // Valid edge ID
    const validVertexId = "0,0,0::1,-1,0::1,0,-1"; // Valid vertex ID

    const mockHexes: [string, Hex][] = [
        ['0,0,0', { id: '0,0,0', coords: { q: 0, r: 0, s: 0 }, terrain: TerrainType.Forest, tokenValue: 6 }],
        ['1,-1,0', { id: '1,-1,0', coords: { q: 1, r: -1, s: 0 }, terrain: TerrainType.Fields, tokenValue: 5 }],
        ['1,0,-1', { id: '1,0,-1', coords: { q: 1, r: 0, s: -1 }, terrain: TerrainType.Pasture, tokenValue: 9 }]
    ];

    const baseG: GameState = {
        players: {
            '0': {
                id: '0',
                name: 'Player 1',
                color: 'red',
                resources: { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 },
                roads: [],
                settlements: [],
                victoryPoints: 0,
            },
        },
        board: { edges: {}, vertices: {}, hexes: Object.fromEntries(mockHexes), ports: {} },
        setupPhase: { activeRound: 1 },
        setupOrder: ['0', '1'],
        lastRoll: [0, 0],
        boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
        rollStatus: RollStatus.IDLE,
        robberLocation: '0,0,0',
        playersToDiscard: [],
        notification: null,
    };

    let G: GameState;

    beforeEach(() => {
        G = _.cloneDeep(baseG);
    });

    describe('buildRoad', () => {
        it('should fail with zero resources', () => {
            const call = () => (buildRoad as MoveFn)({ G, ctx: mockContext }, validEdgeId);
            expect(call).toThrow("Not enough resources to build a road (requires Wood, Brick)");
        });

        it('should fail with partial resources', () => {
            G.players['0'].resources = { wood: 1, brick: 0, wheat: 10, sheep: 10, ore: 10 };
            const call = () => (buildRoad as MoveFn)({ G, ctx: mockContext }, validEdgeId);
            expect(call).toThrow("Not enough resources to build a road (requires Wood, Brick)");
        });

        it('should not deduct resources on an invalid placement', () => {
            G.players['0'].resources = { wood: 1, brick: 1, wheat: 0, sheep: 0, ore: 0 };
            G.board.edges[validEdgeId] = { owner: '1' }; // eslint-disable-line security/detect-object-injection
            const call = () => (buildRoad as MoveFn)({ G, ctx: mockContext }, validEdgeId);
            expect(call).toThrow("This edge is already occupied");

            expect(G.players['0'].resources.wood).toBe(1);
            expect(G.players['0'].resources.brick).toBe(1);
        });
    });

    describe('buildSettlement', () => {
        it('should fail if missing sheep', () => {
            G.players['0'].resources = { wood: 1, brick: 1, wheat: 1, sheep: 0, ore: 0 };
            const call = () => (buildSettlement as MoveFn)({ G, ctx: mockContext }, validVertexId);
            expect(call).toThrow("Not enough resources to build a settlement (requires Wood, Brick, Wheat, Sheep)");
        });

        it('should fail if missing wheat', () => {
            G.players['0'].resources = { wood: 1, brick: 1, wheat: 0, sheep: 1, ore: 0 };
            const call = () => (buildSettlement as MoveFn)({ G, ctx: mockContext }, validVertexId);
            expect(call).toThrow("Not enough resources to build a settlement (requires Wood, Brick, Wheat, Sheep)");
        });
    });

    describe('buildCity', () => {
        it('should fail if missing wheat', () => {
            G.players['0'].resources = { wood: 10, brick: 10, wheat: 1, ore: 3, sheep: 0 };
            const call = () => (buildCity as MoveFn)({ G, ctx: mockContext }, validVertexId);
            expect(call).toThrow("Not enough resources to build a city (requires 3 Ore, 2 Wheat)");
        });

        it('should fail if missing ore', () => {
            G.players['0'].resources = { wheat: 2, ore: 2, wood: 0, brick: 0, sheep: 0 };
            const call = () => (buildCity as MoveFn)({ G, ctx: mockContext }, validVertexId);
            expect(call).toThrow("Not enough resources to build a city (requires 3 Ore, 2 Wheat)");
        });
    });
});
