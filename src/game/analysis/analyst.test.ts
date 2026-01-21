import { calculatePlayerPotentialPips } from './analyst';
import { GameState, TerrainType } from '../types';

describe('calculatePlayerPotentialPips', () => {
    const createMockGameState = (): GameState => ({
        players: {
            '0': { id: '0', name: 'P0', color: 'red', resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, settlements: [], roads: [], victoryPoints: 0 },
            '1': { id: '1', name: 'P1', color: 'blue', resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, settlements: [], roads: [], victoryPoints: 0 }
        },
        board: {
            hexes: {
                '0,0,0': { id: '0,0,0', coords: { q: 0, r: 0, s: 0 }, terrain: TerrainType.Forest, tokenValue: 6 }, // 5 pips (Wood)
                '1,-1,0': { id: '1,-1,0', coords: { q: 1, r: -1, s: 0 }, terrain: TerrainType.Hills, tokenValue: 5 }, // 4 pips (Brick)
                '1,0,-1': { id: '1,0,-1', coords: { q: 1, r: 0, s: -1 }, terrain: TerrainType.Desert, tokenValue: null } // 0 pips
            },
            vertices: {},
            edges: {},
            ports: {}
        }
    } as unknown as GameState);

    let mockG: GameState;

    beforeEach(() => {
        mockG = createMockGameState();
    });

    const addVertex = (id: string, owner: string, type: 'settlement' | 'city') => {
        mockG.board.vertices[id] = { owner, type }; // eslint-disable-line security/detect-object-injection
    };

    test('should return 0 pips for no settlements', () => {
        const result = calculatePlayerPotentialPips(mockG);
        expect(result['0'].wood).toBe(0);
        expect(result['0'].brick).toBe(0);
    });

    test('should calculate pips for a single settlement', () => {
        const vId = '0,0,0::1,-1,0::1,0,-1';
        addVertex(vId, '0', 'settlement');

        const result = calculatePlayerPotentialPips(mockG);

        expect(result['0'].wood).toBe(5);
        expect(result['0'].brick).toBe(4);
        expect(result['0'].ore).toBe(0);
    });

    test('should double pips for a city', () => {
        const vId = '0,0,0::1,-1,0::1,0,-1';
        addVertex(vId, '0', 'city');

        const result = calculatePlayerPotentialPips(mockG);

        expect(result['0'].wood).toBe(10); // 5 * 2
        expect(result['0'].brick).toBe(8); // 4 * 2
    });

    test('should sum pips from multiple settlements', () => {
        addVertex('0,0,0::99,99,99::98,98,98', '0', 'settlement'); // Adjacent to Wood
        addVertex('1,-1,0::97,97,97::96,96,96', '0', 'settlement'); // Adjacent to Brick

        const result = calculatePlayerPotentialPips(mockG);

        expect(result['0'].wood).toBe(5);
        expect(result['0'].brick).toBe(4);
    });

    test('should handle multiple players', () => {
         addVertex('0,0,0::99,99,99', '0', 'settlement'); // P0 on Wood
         addVertex('1,-1,0::98,98,98', '1', 'settlement'); // P1 on Brick

         const result = calculatePlayerPotentialPips(mockG);

         expect(result['0'].wood).toBe(5);
         expect(result['1'].brick).toBe(4);
         expect(result['0'].brick).toBe(0);
         expect(result['1'].wood).toBe(0);
    });
});
