/** @jest-environment jsdom */
import { BotCoach } from './BotCoach';
import { GameState, BotMove } from '../game/types';
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
            const moves: BotMove[] = [
                { move: 'placeRoad', args: ['e1'] },
                { move: 'placeRoad', args: ['e2'] }
            ];
            const result = botCoach.filterOptimalMoves(moves, '0');
            expect(result).toHaveLength(2);
        });

        it('should filter setup settlements based on coach recommendation', () => {
            const moves: BotMove[] = [
                { move: 'placeSettlement', args: ['v1'] }, // Good
                { move: 'placeSettlement', args: ['v2'] }, // Bad
                { move: 'placeSettlement', args: ['v3'] }  // Good
            ];

            // Mock coach to recommend v1 and v3
            (coach.getBestSettlementSpots as jest.Mock).mockReturnValue([
                { vertexId: 'v1' }, { vertexId: 'v3' }, { vertexId: 'v4' }
            ]);

            const result = botCoach.filterOptimalMoves(moves, '0');
            expect(result).toHaveLength(2);
            // Use optional chaining for safety in test assertion
            expect(result.map(m => m.args?.[0])).toEqual(['v1', 'v3']);
        });

        it('should filter acting moves based on weights', () => {
             // Default profile: City > Settlement > Road > EndTurn
             const moves: BotMove[] = [
                 { move: 'endTurn', args: [] },
                 { move: 'buildSettlement', args: ['v1'] },
                 { move: 'buildCity', args: ['v2'] }, // Highest weight
                 { move: 'buildCity', args: ['v3'] }  // Highest weight
             ];

             const result = botCoach.filterOptimalMoves(moves, '0');
             expect(result).toHaveLength(2);
             expect(result.every(m => m.move === 'buildCity')).toBe(true);
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

             const moves: BotMove[] = [
                 { move: 'endTurn', args: [] }, // Weight 1 (base)
                 { move: 'buildSettlement', args: ['v1'] }, // Weight 1
             ];

             const result = flatCoach.filterOptimalMoves(moves, '0');
             expect(result).toHaveLength(2);
        });
    });
});
