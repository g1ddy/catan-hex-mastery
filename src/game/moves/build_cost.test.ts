import { buildRoad, buildSettlement, buildCity } from './build';

describe('Unit Test: Resource Costs', () => {
    const mockContext = { currentPlayer: '0' } as any;

    const baseG = {
        players: {
            '0': {
                resources: { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 },
                roads: [],
                settlements: [],
                victoryPoints: 0
            }
        },
        board: { edges: {}, vertices: {} }
    } as any;

    test('buildRoad checks resources', () => {
        const G = JSON.parse(JSON.stringify(baseG));

        // 0 resources
        expect((buildRoad as any)({ G, ctx: mockContext } as any, 'edge1')).toBe('INVALID_MOVE');

        // Partial resources
        G.players['0'].resources = { wood: 1, brick: 0, wheat: 10, sheep: 10, ore: 10 };
        expect((buildRoad as any)({ G, ctx: mockContext } as any, 'edge1')).toBe('INVALID_MOVE');

        // Sufficient resources but invalid placement (to ensure cost check passed)
        G.players['0'].resources = { wood: 1, brick: 1, wheat: 0, sheep: 0, ore: 0 };
        // Occupy edge to force INVALID_MOVE from Occupancy check (which comes AFTER cost check)
        G.board.edges['edge1'] = { owner: '1' };
        expect((buildRoad as any)({ G, ctx: mockContext } as any, 'edge1')).toBe('INVALID_MOVE');

        // Resources NOT deducted if invalid
        expect(G.players['0'].resources.wood).toBe(1);
        expect(G.players['0'].resources.brick).toBe(1);
    });

    test('buildSettlement checks resources', () => {
        const G = JSON.parse(JSON.stringify(baseG));
        // Cost: 1 Wood, 1 Brick, 1 Wheat, 1 Sheep
        G.players['0'].resources = { wood: 1, brick: 1, wheat: 1, sheep: 0, ore: 0 }; // Missing sheep
        expect((buildSettlement as any)({ G, ctx: mockContext } as any, 'v1')).toBe('INVALID_MOVE');

        // Partial
        G.players['0'].resources = { wood: 1, brick: 1, wheat: 0, sheep: 1, ore: 0 }; // Missing wheat
        expect((buildSettlement as any)({ G, ctx: mockContext } as any, 'v1')).toBe('INVALID_MOVE');
    });

    test('buildCity checks resources', () => {
        const G = JSON.parse(JSON.stringify(baseG));
        // Cost: 3 Ore, 2 Wheat
        G.players['0'].resources = { wood: 10, brick: 10, wheat: 1, ore: 3 }; // Missing wheat
        expect((buildCity as any)({ G, ctx: mockContext } as any, 'v1')).toBe('INVALID_MOVE');

        G.players['0'].resources = { wheat: 2, ore: 2, wood: 0, brick: 0, sheep: 0 }; // Missing ore
        expect((buildCity as any)({ G, ctx: mockContext } as any, 'v1')).toBe('INVALID_MOVE');
    });
});
