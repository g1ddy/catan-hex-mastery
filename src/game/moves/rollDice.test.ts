import { CatanGame } from '../Game';
import { GameState, TerrainType } from '../types';
import { getVerticesForHex } from '../hexUtils';

describe('Unit Test: Roll Dice & Resource Distribution', () => {
    // Helper to get the rollDice move from the Game definition
    const rollDiceMove = CatanGame.phases?.GAMEPLAY?.turn?.stages?.roll?.moves?.rollDice;

    if (!rollDiceMove) {
        throw new Error("rollDice move not found in CatanGame definition");
    }

    const mockRandom = {
        Die: jest.fn()
    };

    const mockEvents = {
        setStage: jest.fn()
    };

    let G: GameState;

    beforeEach(() => {
        const h1Coords = { q: 0, r: 0, s: 0 };
        const h1Vertices = getVerticesForHex(h1Coords);

        // Setup a basic game state
        G = {
            players: {
                '0': {
                    id: '0',
                    color: 'red',
                    resources: { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 },
                    roads: [],
                    settlements: [],
                    victoryPoints: 0,
                },
                '1': {
                    id: '1',
                    color: 'blue',
                    resources: { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 },
                    roads: [],
                    settlements: [],
                    victoryPoints: 0,
                }
            },
            board: {
                edges: {},
                vertices: {
                    // Player 0 has a settlement on a hex that produces Wood on an 8
                    [h1Vertices[0]]: { owner: '0', type: 'settlement' },
                     // Player 1 has a city on the same hex
                    [h1Vertices[1]]: { owner: '1', type: 'city' }
                },
                hexes: {
                    'h1': {
                        id: 'h1',
                        coords: h1Coords,
                        terrain: TerrainType.Forest, // Produces Wood
                        tokenValue: 8
                    }
                }
            },
            setupPhase: { activeRound: 1, activeSettlement: null },
            setupOrder: ['0', '1'],
            lastRoll: [0, 0],
            lastRollRewards: {},
            boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
            hasRolled: false,
        };

        // Reset mocks
        mockRandom.Die.mockReset();
        mockEvents.setStage.mockReset();
    });

    it('should distribute resources correctly when dice roll matches hex token', () => {
        // Mock dice to roll 4 + 4 = 8
        mockRandom.Die.mockReturnValueOnce(4).mockReturnValueOnce(4);

        // Execute move
        (rollDiceMove as any)({ G, random: mockRandom, events: mockEvents });

        // Assertions
        expect(G.lastRoll).toEqual([4, 4]);
        expect(G.hasRolled).toBe(true);

        // Player 0 (Settlement) gets 1 Wood
        expect(G.players['0'].resources.wood).toBe(1);
        expect(G.lastRollRewards['0']).toEqual({ wood: 1 });

        // Player 1 (City) gets 2 Wood
        expect(G.players['1'].resources.wood).toBe(2);
        expect(G.lastRollRewards['1']).toEqual({ wood: 2 });
    });

    it('should not distribute resources if roll does not match', () => {
        // Mock dice to roll 3 + 3 = 6 (No hex has 6)
        mockRandom.Die.mockReturnValueOnce(3).mockReturnValueOnce(3);

        (rollDiceMove as any)({ G, random: mockRandom, events: mockEvents });

        expect(G.lastRoll).toEqual([3, 3]);
        expect(G.players['0'].resources.wood).toBe(0);
        expect(G.players['1'].resources.wood).toBe(0);
        expect(G.lastRollRewards).toEqual({});
    });

    it('should not distribute resources for 7', () => {
        // Mock dice to roll 3 + 4 = 7
        mockRandom.Die.mockReturnValueOnce(3).mockReturnValueOnce(4);

        (rollDiceMove as any)({ G, random: mockRandom, events: mockEvents });

        expect(G.lastRoll).toEqual([3, 4]);
        expect(G.players['0'].resources.wood).toBe(0);
        expect(G.lastRollRewards).toEqual({});
    });
});
