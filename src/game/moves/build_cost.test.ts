import { buildRoad, buildSettlement, buildCity } from './build';
import { GameState } from '../types';
import { Ctx } from 'boardgame.io';
import * as _ from 'lodash';

describe('Unit Test: Resource Costs', () => {
    const mockContext: Ctx = { currentPlayer: '0' } as Ctx;

    const baseG: GameState = {
        players: {
            '0': {
                id: '0',
                color: 'red',
                resources: { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 },
                roads: [],
                settlements: [],
                victoryPoints: 0,
            },
        },
        board: { edges: {}, vertices: {}, hexes: {} },
        setupPhase: { activeRound: 1, activeSettlement: null },
        setupOrder: ['0', '1'],
        lastRoll: [0, 0],
        lastRollRewards: {},
        boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
        hasRolled: false,
    };

    let G: GameState;

    beforeEach(() => {
        G = _.cloneDeep(baseG);
    });

    describe('buildRoad', () => {
        it('should fail with zero resources', () => {
            expect((buildRoad as any)({ G, ctx: mockContext }, 'edge1')).toBe('INVALID_MOVE');
        });

        it('should fail with partial resources', () => {
            G.players['0'].resources = { wood: 1, brick: 0, wheat: 10, sheep: 10, ore: 10 };
            expect((buildRoad as any)({ G, ctx: mockContext }, 'edge1')).toBe('INVALID_MOVE');
        });

        it('should not deduct resources on an invalid placement', () => {
            G.players['0'].resources = { wood: 1, brick: 1, wheat: 0, sheep: 0, ore: 0 };
            // Occupy edge to force INVALID_MOVE from Occupancy check (which comes AFTER cost check)
            G.board.edges['edge1'] = { owner: '1' };
            expect((buildRoad as any)({ G, ctx: mockContext }, 'edge1')).toBe('INVALID_MOVE');

            // Resources should NOT be deducted
            expect(G.players['0'].resources.wood).toBe(1);
            expect(G.players['0'].resources.brick).toBe(1);
        });
    });

    describe('buildSettlement', () => {
        it('should fail if missing sheep', () => {
            G.players['0'].resources = { wood: 1, brick: 1, wheat: 1, sheep: 0, ore: 0 };
            expect((buildSettlement as any)({ G, ctx: mockContext }, 'v1')).toBe('INVALID_MOVE');
        });

        it('should fail if missing wheat', () => {
            G.players['0'].resources = { wood: 1, brick: 1, wheat: 0, sheep: 1, ore: 0 };
            expect((buildSettlement as any)({ G, ctx: mockContext }, 'v1')).toBe('INVALID_MOVE');
        });
    });

    describe('buildCity', () => {
        it('should fail if missing wheat', () => {
            G.players['0'].resources = { wood: 10, brick: 10, wheat: 1, ore: 3, sheep: 0 };
            expect((buildCity as any)({ G, ctx: mockContext }, 'v1')).toBe('INVALID_MOVE');
        });

        it('should fail if missing ore', () => {
            G.players['0'].resources = { wheat: 2, ore: 2, wood: 0, brick: 0, sheep: 0 };
            expect((buildCity as any)({ G, ctx: mockContext }, 'v1')).toBe('INVALID_MOVE');
        });
    });
});
