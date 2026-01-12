/** @jest-environment jsdom */
import { BotCoach } from './BotCoach';
import { GameState, GameAction, MakeMoveAction } from '../game/types';
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
    });

    describe('filterOptimalMoves', () => {
        it('should return all moves for setup roads', () => {
            const moves = [
                mockAction('placeRoad', ['e1']),
                mockAction('placeRoad', ['e2'])
            ];
            const result = botCoach.filterOptimalMoves(moves, '0');
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

            const result = botCoach.filterOptimalMoves(moves, '0');
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

             const result = botCoach.filterOptimalMoves(moves, '0');
             expect(result).toHaveLength(2);

             const actions = result as MakeMoveAction[];
             expect(actions.every(m => m.payload.type === 'buildCity')).toBe(true);
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

             const result = flatCoach.filterOptimalMoves(moves, '0');
             expect(result).toHaveLength(2);
        });
    });
});
