/** @jest-environment jsdom */
import { Ctx } from 'boardgame.io';
import { BotCoach } from './BotCoach';
import { GameState, MakeMoveAction } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { BotProfile } from './profiles/BotProfile';

// Mock dependencies
jest.mock('../game/analysis/coach');
jest.mock('../game/rules/validator', () => ({
    getValidSettlementSpots: jest.fn(() => new Set(['2_2_2'])),
    getValidCitySpots: jest.fn(() => new Set(['3_3_3'])),
    getValidRoadSpots: jest.fn(() => new Set(['edge_2'])),
    getValidSetupRoadSpots: jest.fn(() => new Set(['edge_1'])),
    getValidSetupSettlementSpots: jest.fn(() => new Set(['1_1_1'])),
}));
jest.mock('../game/mechanics/costs', () => ({
    getAffordableBuilds: jest.fn(() => ({
        settlement: true,
        city: true,
        road: true,
        devCard: true
    }))
}));

// Helper to create mock Redux actions (simplified)
const mockAction = (moveType: string, args: any[] = []): MakeMoveAction => ({
    type: 'MAKE_MOVE',
    payload: { type: moveType, args, playerID: '0' }
});

describe('BotCoach', () => {
    let G: GameState;
    let coach: Coach;
    let botCoach: BotCoach;
    let mockCtx: Ctx;

    beforeEach(() => {
        G = {
            players: {
                '0': {
                    id: '0',
                    resources: { wood: 10, brick: 10, wheat: 10, sheep: 10, ore: 10 },
                    settlements: [],
                    roads: [],
                    victoryPoints: 0,
                    color: 'red'
                }
            }
        } as unknown as GameState;
        coach = new Coach(G);
        botCoach = new BotCoach(G, coach);
        mockCtx = { currentPlayer: '0' } as Ctx;
    });

    describe('filterOptimalMoves', () => {
        it('should return all moves for setup roads', () => {
            const moves = [
                mockAction('placeRoad', ['e1']),
                mockAction('placeRoad', ['e2'])
            ];
            const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);
            expect(result).toHaveLength(2);
        });

        it('should filter setup settlements based on coach recommendation', () => {
            const moves = [
                mockAction('placeSettlement', ['v1']), // Good
                mockAction('placeSettlement', ['v2']), // Bad
                mockAction('placeSettlement', ['v3'])  // Good
            ];

            // Mock coach to recommend v1 and v3
            (coach.getBestSettlementSpots as jest.Mock).mockReturnValue([
                { vertexId: 'v1' }, { vertexId: 'v3' }, { vertexId: 'v4' }
            ]);

            const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);
            expect(result).toHaveLength(2);

            // Verify args extraction - Cast to MakeMoveAction since we know the input
            const actions = result as MakeMoveAction[];
            expect(actions.map(m => m.payload.args[0])).toEqual(['v1', 'v3']);
        });

        it('should filter acting moves based on weights', () => {
             // Default profile: City > Settlement > Road > EndTurn
             const moves = [
                 mockAction('endTurn'),
                 mockAction('buildSettlement', ['v1']),
                 mockAction('buildCity', ['v2']), // Highest weight
                 mockAction('buildCity', ['v3'])  // Highest weight
             ];

             // Mock board and hexes to prevent crash in pip calculation logic
             G.board = { hexes: {}, vertices: {}, edges: {} } as any;
             jest.mock('../game/hexUtils', () => ({
                getHexesForVertex: jest.fn(() => []),
             }));

             const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);
             // With the new logic, it should pick the single best city, not both.
             expect(result).toHaveLength(1);

             const actions = result as MakeMoveAction[];
             expect(actions[0].payload.type).toBe('buildCity');
        });

        it('should return all moves if weights are equal', () => {
             // Create a profile with equal weights
             const flatProfile: BotProfile = {
                 name: 'Flat',
                 description: '',
                 weights: { buildCity: 1, buildSettlement: 1, buildRoad: 1, buyDevCard: 1 },
                 expansion: { aggressiveness: 0.5, diversityPreference: 0.5 }
             };
             const flatCoach = new BotCoach(G, coach, flatProfile);

             const moves = [
                 mockAction('endTurn'), // Weight 1 (base)
                 mockAction('buildSettlement', ['v1']), // Weight 1
             ];

             const result = flatCoach.filterOptimalMoves(moves, '0', mockCtx);
             expect(result).toHaveLength(2);
        });

        it('should choose the city with the highest pips when upgrading', () => {
            // High-pip settlement at vertex v1, low-pip at v2
            G.board = {
                hexes: {
                    'h1': { tokenValue: 8 }, // 5 pips
                    'h2': { tokenValue: 5 }, // 4 pips
                    'h3': { tokenValue: 9 }, // 4 pips
                    'h4': { tokenValue: 2 }, // 1 pip
                    'h5': { tokenValue: 12 },// 1 pip
                    'h6': { tokenValue: 3 }  // 2 pips
                },
                vertices: {},
                edges: {},
            } as any;

            // Mock getHexesForVertex to link vertices to hexes
            jest.mock('../game/hexUtils', () => ({
                getHexesForVertex: jest.fn(vId => {
                    if (vId === 'v1') return ['h1', 'h2', 'h3']; // 5 + 4 + 4 = 13 pips
                    if (vId === 'v2') return ['h4', 'h5', 'h6']; // 1 + 1 + 2 = 4 pips
                    return [];
                }),
            }));

            // Both moves have the same high weight
            const moves = [
                mockAction('buildCity', ['v1']), // Correct choice
                mockAction('buildCity', ['v2'])
            ];

            const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);

            expect(result).toHaveLength(1);
            const action = result[0] as MakeMoveAction;
            expect(action.payload.type).toBe('buildCity');
            expect(action.payload.args[0]).toBe('v1');
        });
    });
});
