import { getBestSettlementSpots } from './coach';
import { GameState, TerrainType, Player, BoardState } from '../types';

describe('getBestSettlementSpots', () => {

    // Hexes: Center, TopRight, RightBottom
    // (0,0,0)
    // (1,-1,0)
    // (1,0,-1)
    // These 3 meet at a vertex.
    const HEX_A_ID = '0,0,0';
    const HEX_B_ID = '1,-1,0';
    const HEX_C_ID = '1,0,-1';

    // Calculate expected vertex ID:
    // Sorted: 0,0,0 -> 1,-1,0 -> 1,0,-1 (1, -1 comes before 1, 0)
    // Actually sorting logic: q asc, r asc, s asc.
    // 0,0,0 (q=0) First.
    // 1,-1,0 (q=1, r=-1) Second.
    // 1,0,-1 (q=1, r=0) Third.
    const TARGET_VERTEX_ID = `${HEX_A_ID}::${HEX_B_ID}::${HEX_C_ID}`;

    const createMockState = (
        hexConfig: { id: string, terrain: TerrainType, value: number }[],
        settlementCount: number = 0,
        firstSettlementResources: string[] = [] // Resources produced by first settlement
    ): GameState => {
        const hexes: any = {};

        // Fill basic map around 0,0,0 to ensure getVerticesForHex finds something
        hexConfig.forEach(h => {
            const [q, r, s] = h.id.split(',').map(Number);
            hexes[h.id] = {
                id: h.id,
                coords: { q, r, s },
                terrain: h.terrain,
                tokenValue: h.value
            };
        });

        // Mock board stats
        const boardStats: any = {
            totalPips: {
                wood: 100, brick: 100, sheep: 100, wheat: 100, ore: 100
            }
        };

        const player: Player = {
            id: '0',
            color: 'red',
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            settlements: [],
            roads: [],
            victoryPoints: 0
        };

        // If settlementCount > 0, we need to mock a first settlement.
        // We'll place it far away to avoid interference, or just assume the 'firstSettlementResources'
        // implies what the player "produces".
        // The implementation will look at `player.settlements[0]` and its adjacent hexes.
        // So we must create a dummy settlement and adjacent hexes for it.

        if (settlementCount > 0) {
            // Create a dummy settlement at 10,10,10 (far away)
            const s1Id = '10,10,-20::11,9,-20::10,9,-19'; // Arbitrary valid-ish ID
            player.settlements.push(s1Id);

            // We need to ensure the hexes for this settlement exist in G.board.hexes
            // and have the resources specified in `firstSettlementResources`.
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
                if (res) {
                   hexes[hid] = {
                       id: hid,
                       coords: { q: 10+idx, r: 10, s: -20-idx }, // Fake coords
                       terrain: terrainMap[res],
                       tokenValue: 2 // 1 pip
                   };
                } else {
                   // Fill remaining with Desert
                   hexes[hid] = {
                       id: hid,
                       coords: { q: 10+idx, r: 10, s: -20-idx },
                       terrain: TerrainType.Desert,
                       tokenValue: null
                   };
                }
            });
        }

        return {
            board: { hexes, vertices: {}, edges: {} } as BoardState,
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

        // Base Pips: 13
        // Scarcity: 1.0 (Mocked high stats) -> Wait, logic checks < 0.10. 100/500 = 0.2. So Scarcity FALSE.
        // Diversity: 3 unique -> 1.2x
        // Synergy: 0 settlements -> Wood+Brick (+2).
        // Total: (13 * 1.2) + 2 = 15.6 + 2 = 17.6

        // Current implementation (Before changes): 13 + 2 (Synergy) = 15. (No Diversity yet).
        // This test is EXPECTING the NEW logic.
        // I will assert the value assuming the code IS changed.
        // Since I haven't changed code yet, this test will FAIL.

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

        // Base Pips: 13
        // Diversity: Duplicate -> 1.0x
        // Synergy: 0 settlements -> No pair (Wood+Wood+Sheep != Wood+Brick). So +0.
        // Total: 13 * 1.0 + 0 = 13.

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
        expect(target?.reason).toContain('Balances Economy');
        expect(target?.reason).toContain('Added ore');
        expect(target?.reason).toContain('Added wheat');
    });

    test('Second Settlement: Should NOT apply static Synergy', () => {
        // Setup: Player has Sheep.
        // Candidate: Wood, Brick, Ore.
        // Pips: 13.
        // Diversity: Yes (1.2x) -> 15.6.
        // Need Bonus: Wood(+5), Brick(+5), Ore(+5) -> +15. Total 30.6.
        // Static Synergy (Wood+Brick) should NOT apply (+2).
        // If it did apply: 32.6.

        const hexes = [
            { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
            { id: HEX_B_ID, terrain: TerrainType.Hills, value: 5 },
            { id: HEX_C_ID, terrain: TerrainType.Mountains, value: 9 }
        ];

        const G = createMockState(hexes, 1, ['sheep']);

        const results = getBestSettlementSpots(G, '0');
        const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);

        expect(target?.score).toBeCloseTo(30.6); // Not 32.6
    });
});
