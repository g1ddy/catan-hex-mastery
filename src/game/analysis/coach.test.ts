import { getBestSettlementSpots } from './coach';
import { GameState, TerrainType, Player, BoardState, Hex } from '../types';

describe('getBestSettlementSpots', () => {

    // Hexes: Center, TopRight, RightBottom
    // (0,0,0)
    // (1,-1,0)
    // (1,0,-1)
    // These 3 meet at a vertex.
    const HEX_A_ID = '0,0,0';
    const HEX_B_ID = '1,-1,0';
    const HEX_C_ID = '1,0,-1';
    const TARGET_VERTEX_ID = `${HEX_A_ID}::${HEX_B_ID}::${HEX_C_ID}`;

    // Helper to create a partial Mock state using RecursivePartial logic or just explicit Partial
    const createMockState = (
        hexConfig: { id: string, terrain: TerrainType, value: number }[],
        settlementCount: number = 0,
        firstSettlementResources: string[] = []
    ): GameState => {
        // 1. Construct Hexes with correct typing
        const hexes: Record<string, Hex> = {};
        hexConfig.forEach(h => {
            const [q, r, s] = h.id.split(',').map(Number);
            hexes[h.id] = {
                id: h.id,
                coords: { q, r, s },
                terrain: h.terrain,
                tokenValue: h.value
            } as Hex;
        });

        // 2. Mock BoardStats
        const boardStats = {
            totalPips: {
                wood: 100, brick: 100, sheep: 100, wheat: 100, ore: 100
            }
        };

        // 3. Construct Player
        const player: Player = {
            id: '0',
            color: 'red',
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            settlements: [],
            roads: [],
            victoryPoints: 0
        };

        // 4. Handle First Settlement Mocking
        if (settlementCount > 0) {
            // Create a dummy settlement far away
            // ID format: h1::h2::h3
            const s1Id = '10,10,-20::11,9,-20::10,9,-19';
            player.settlements.push(s1Id);

            // Map resources to terrain
            const s1HexIds = s1Id.split('::');
            const terrainMap: Record<string, TerrainType> = {
                'wood': TerrainType.Forest,
                'brick': TerrainType.Hills,
                'sheep': TerrainType.Pasture,
                'wheat': TerrainType.Fields,
                'ore': TerrainType.Mountains
            };

            s1HexIds.forEach((hid, idx) => {
                const res = firstSettlementResources[idx];
                // We must use fake coords that match the ID, although the code just looks up the ID in hexes.
                // Actually the code splits the ID to get keys for lookup.
                // So the keys in `hexes` must match `hid`.

                if (res) {
                   hexes[hid] = {
                       id: hid,
                       coords: { q: 10+idx, r: 10, s: -20-idx },
                       terrain: terrainMap[res],
                       tokenValue: 2 // 1 pip
                   } as Hex;
                } else {
                   hexes[hid] = {
                       id: hid,
                       coords: { q: 10+idx, r: 10, s: -20-idx },
                       terrain: TerrainType.Desert,
                       tokenValue: null
                   } as Hex;
                }
            });
        }

        // Return a Partial cast to GameState to satisfy the test,
        // but constructed with more type awareness.
        return {
            board: {
                hexes,
                vertices: {},
                edges: {}
            } as BoardState,
            players: { '0': player },
            boardStats
        } as unknown as GameState;
    };

    test('Diversity Multiplier: Should apply +20% for 3 unique resources', () => {
        // Hexes: Wood(6=5p), Brick(5=4p), Sheep(9=4p) -> Pips: 5+4+4 = 13
        const hexes = [
            { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
            { id: HEX_B_ID, terrain: TerrainType.Hills, value: 5 },
            { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
        ];
        const G = createMockState(hexes);

        const results = getBestSettlementSpots(G, '0');
        const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);

        expect(target).toBeDefined();
        // (13 * 1.2) + 2 (Synergy) = 17.6
        expect(target?.score).toBeCloseTo(17.6);
        expect(target?.reason).toContain('Diversity Bonus');
    });

    test('Diversity Multiplier: Should NOT apply for duplicates', () => {
        // Hexes: Wood(6), Wood(5), Sheep(9) -> Pips: 13
        const hexes = [
            { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
            { id: HEX_B_ID, terrain: TerrainType.Forest, value: 5 },
            { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
        ];
        const G = createMockState(hexes);

        const results = getBestSettlementSpots(G, '0');
        const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);

        // 13 * 1.0 = 13.
        expect(target?.score).toBeCloseTo(13.0);
        expect(target?.reason).not.toContain('Diversity Bonus');
    });

    test('Second Settlement: Should apply One of Everything Bonus', () => {
        // Setup: Player already has Wood, Brick.
        // Candidate Spot: Ore(6), Wheat(5), Sheep(9). (All new!).
        // Pips: 13.
        // Diversity: Unique -> 1.2x.
        // Base Score: 13 * 1.2 = 15.6.
        // Need Bonus: Ore(+5), Wheat(+5), Sheep(+5) -> +15.
        // Total: 15.6 + 15 = 30.6.

        const hexes = [
            { id: HEX_A_ID, terrain: TerrainType.Mountains, value: 6 }, // Ore
            { id: HEX_B_ID, terrain: TerrainType.Fields, value: 5 },    // Wheat
            { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }    // Sheep
        ];

        const G = createMockState(hexes, 1, ['wood', 'brick']);

        const results = getBestSettlementSpots(G, '0');
        const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);

        expect(target?.score).toBeCloseTo(30.6);

        // Expect concise reason string
        // The list is sorted: ore, sheep, wheat
        expect(target?.reason).toContain('Balances Economy (Added ore, sheep, wheat)');

        // Verify individual components if needed, but the full string check covers it.
        // The previous separate checks are no longer valid with the new format.
    });

    test('Second Settlement: Should NOT apply static Synergy', () => {
        // Setup: Player has Sheep.
        // Candidate: Wood, Brick, Ore.
        // Pips: 13.
        // Diversity: Yes (1.2x) -> 15.6.
        // Need Bonus: Wood(+5), Brick(+5), Ore(+5) -> +15. Total 30.6.
        // Static Synergy (Wood+Brick) should NOT apply (+2).

        const hexes = [
            { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
            { id: HEX_B_ID, terrain: TerrainType.Hills, value: 5 },
            { id: HEX_C_ID, terrain: TerrainType.Mountains, value: 9 }
        ];

        const G = createMockState(hexes, 1, ['sheep']);

        const results = getBestSettlementSpots(G, '0');
        const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);

        expect(target?.score).toBeCloseTo(30.6);
    });
});
