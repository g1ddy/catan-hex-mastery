import { distributeResources } from './resources';
import { GameState, TerrainType } from '../types';

// Mock getVerticesForHex
jest.mock('../hexUtils', () => ({
    getVerticesForHex: (coords: { q: number, r: number, s: number }) => {
        // Return predictable vertex IDs based on coords
        return [`${coords.q},${coords.r},${coords.s}`];
    }
}));

describe('distributeResources', () => {
    let G: GameState;

    beforeEach(() => {
        G = {
            board: {
                hexes: {
                    '0,0,0': {
                        id: '0,0,0',
                        coords: { q: 0, r: 0, s: 0 },
                        terrain: TerrainType.Forest,
                        tokenValue: 6
                    },
                    '1,0,-1': {
                        id: '1,0,-1',
                        coords: { q: 1, r: 0, s: -1 },
                        terrain: TerrainType.Mountains,
                        tokenValue: 8
                    }
                },
                vertices: {
                    '0,0,0': { owner: '0', type: 'settlement' },
                    '1,0,-1': { owner: '1', type: 'city' }
                },
                edges: {}
            },
            players: {
                '0': { id: '0', resources: { wood: 0, ore: 0 }, settlements: [], roads: [], victoryPoints: 0 } as any,
                '1': { id: '1', resources: { wood: 0, ore: 0 }, settlements: [], roads: [], victoryPoints: 0 } as any
            },
            lastRollRewards: {}
        } as unknown as GameState;
    });

    test('Should distribute resources for settlements (1x)', () => {
        distributeResources(G, 6);
        expect(G.players['0'].resources.wood).toBe(1);
        expect(G.players['1'].resources.ore).toBe(0);
    });

    test('Should distribute resources for cities (2x)', () => {
        distributeResources(G, 8);
        expect(G.players['0'].resources.wood).toBe(0);
        expect(G.players['1'].resources.ore).toBe(2);
    });

    test('Should return correct rewards map', () => {
        const rewards = distributeResources(G, 6);
        expect(rewards['0']).toEqual({ wood: 1 });
        expect(rewards['1']).toBeUndefined();
    });

    test('Should handle 7 (Robber) gracefully', () => {
        const rewards = distributeResources(G, 7);
        expect(rewards).toEqual({});
        expect(G.players['0'].resources.wood).toBe(0);
    });

    test('Should ignore non-producing rolls', () => {
        distributeResources(G, 2);
        expect(G.players['0'].resources.wood).toBe(0);
        expect(G.players['1'].resources.ore).toBe(0);
    });
});
