/** @jest-environment jsdom */
import { Ctx } from 'boardgame.io';
import { BotCoach } from './BotCoach';
import { GameState, MakeMoveAction, MoveArguments } from '../game/types';
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
jest.mock('../game/rules/costs', () => ({
    getAffordableBuilds: jest.fn(() => ({
        settlement: true,
        city: true,
        road: true,
        devCard: true
    }))
}));
jest.mock('../game/hexUtils', () => ({
    getHexesForVertex: jest.fn(() => []),
}));

// Helper to create mock Redux actions (simplified)
const mockAction = <K extends keyof MoveArguments>(moveType: K, args: MoveArguments[K] = [] as any): MakeMoveAction => ({
    type: 'MAKE_MOVE',
    payload: { type: moveType, args, playerID: '0' } as any
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

        // Setup Coach mock with valid advice return structure
        coach = new Coach(G);
        (coach.getStrategicAdvice as jest.Mock).mockReturnValue({
            text: 'Test Advice',
            recommendedMoves: []
        });

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
            const args = actions.map(m => {
                if (m.payload.type === 'placeSettlement') {
                    return m.payload.args[0];
                }
                return null;
            });
            expect(args).toEqual(['v1', 'v3']);
        });

        it('should filter acting moves based on weights', () => {
             // Default profile: City > Settlement > Road > EndTurn
             const moves = [
                 mockAction('endTurn'),
                 mockAction('buildSettlement', ['v1']),
                 mockAction('buildCity', ['v2']), // Highest weight
                 mockAction('buildCity', ['v3'])  // Highest weight
             ];

             // We need to mock getBestCitySpots to prevent errors and ensure deterministic behavior
             (coach.getBestCitySpots as jest.Mock).mockReturnValue([
                { vertexId: 'v2', score: 10 }, { vertexId: 'v3', score: 5 }
             ]);

             const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);
             // Should pick the city (which one depends on analysis)

             const actions = result as MakeMoveAction[];
             // Now it returns a list of sorted options
             // Since v2 and v3 are both buildCity (top weight), and v2 is better, it should be first.
             // The old test expected length 1, but the new logic returns "top move and others".
             // Actually, the new logic returns: [BestMove, ...OtherTypes].
             // So if both are cities, it returns the best city, then non-city moves?
             // Let's check logic:
             // const bestMove = cityMoves.find...;
             // if (bestMove) { const others = sortedMoves.filter(m => m !== bestMove); return [bestMove, ...others]; }
             // So it returns ALL moves, but with best city first.

             expect(actions.length).toBeGreaterThanOrEqual(1);
             expect(actions[0].payload.type).toBe('buildCity');
             if (actions[0].payload.type === 'buildCity') {
                  expect(actions[0].payload.args[0]).toBe('v2');
             }
        });

        it('should return all moves if weights are equal', () => {
             // Create a profile with equal weights
             const flatProfile: BotProfile = {
                 name: 'Flat',
                 description: '',
                 weights: { buildCity: 1, buildSettlement: 1, buildRoad: 1, buyDevCard: 1, tradeBank: 1 },
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

        it('should choose the city recommended by Coach when upgrading', () => {
            // Mock Coach to recommend v1 over v2
            (coach.getBestCitySpots as jest.Mock).mockReturnValue([
                { vertexId: 'v1', score: 20 },
                { vertexId: 'v2', score: 5 }
            ]);

            const moves = [
                mockAction('buildCity', ['v2']), // Lower score
                mockAction('buildCity', ['v1'])  // Higher score
            ];

            const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);

            expect(result.length).toBeGreaterThanOrEqual(1);
            const action = result[0] as MakeMoveAction;
            expect(action.payload.type).toBe('buildCity');
            if (action.payload.type === 'buildCity') {
                expect(action.payload.args[0]).toBe('v1');
            }

            // Verify coach was called correctly
            expect(coach.getBestCitySpots).toHaveBeenCalledWith('0', mockCtx, ['v2', 'v1']);
        });

        it('should choose the settlement recommended by Coach when building in gameplay', () => {
            // Mock Coach to recommend v1 over v2
            (coach.getAllSettlementScores as jest.Mock).mockReturnValue([
                { vertexId: 'v1', score: 20 },
                { vertexId: 'v2', score: 5 }
            ]);

            const moves = [
                mockAction('buildSettlement', ['v2']),
                mockAction('buildSettlement', ['v1']),
                mockAction('buildRoad', ['e1']) // Lower weight
            ];

            const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);

            expect(result.length).toBeGreaterThanOrEqual(1);
            const action = result[0] as MakeMoveAction;
            expect(action.payload.type).toBe('buildSettlement');
            if (action.payload.type === 'buildSettlement') {
                expect(action.payload.args[0]).toBe('v1');
            }
        });

        it('should handle invalid player ID gracefully', () => {
            const moves = [mockAction('endTurn')];
            // Match currentPlayer to bypass the first check
            const ctxWithInvalidPlayer = { ...mockCtx, currentPlayer: '999' };
            const result = botCoach.filterOptimalMoves(moves, '999', ctxWithInvalidPlayer);
            expect(result).toEqual([]);
        });

        it('should return all setup settlement moves if analysis fails/returns empty', () => {
            const moves = [
                mockAction('placeSettlement', ['v1']),
                mockAction('placeSettlement', ['v2'])
            ];

            // Mock coach to return empty
            (coach.getBestSettlementSpots as jest.Mock).mockReturnValue([]);

            const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);
            expect(result).toHaveLength(2);
        });

        it('should prioritize advised moves', () => {
            // Coach advises building roads
            (coach.getStrategicAdvice as jest.Mock).mockReturnValue({
                text: 'Build Roads',
                recommendedMoves: ['buildRoad']
            });

            // Even if BuildCity (1.5) > BuildRoad (0.8),
            // the boost (x1.5) makes Road 1.2, which is close to City.
            // Wait, 1.2 is < 1.5. So City still wins.
            // Let's use lower weights. EndTurn (1.0). Road (0.8 -> 1.2).

            const moves = [
                mockAction('endTurn'),
                mockAction('buildRoad', ['e1'])
            ];

            // By default profile, EndTurn (1.0) > BuildRoad (~0.4 or whatever profile says).
            // With boost, Road should beat EndTurn.

            const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);
            const actions = result as MakeMoveAction[];

            expect(actions[0].payload.type).toBe('buildRoad');
        });
    });
});
