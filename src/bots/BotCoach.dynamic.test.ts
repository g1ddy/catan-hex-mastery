/** @jest-environment jsdom */
import { Ctx } from 'boardgame.io';
import { BotCoach } from './BotCoach';
import { GameState, MakeMoveAction, Player } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';

// Mock dependencies
jest.mock('../game/analysis/coach');
jest.mock('../game/mechanics/costs', () => ({
    getAffordableBuilds: jest.fn()
}));

import { getAffordableBuilds } from '../game/mechanics/costs';
import { createMockGameState } from '../game/testUtils';

// Mock getHexesForVertex to avoid crashes
jest.mock('../game/hexUtils', () => ({
    getHexesForVertex: jest.fn(() => [])
}));

// Helper to create mock Redux actions
const mockAction = (moveType: string, args: any[] = []): MakeMoveAction => ({
    type: 'MAKE_MOVE',
    payload: { type: moveType, args, playerID: '0' }
});

describe('BotCoach Dynamic Logic', () => {
    let G: GameState;
    let coach: Coach;
    let botCoach: BotCoach;
    let mockCtx: Ctx;
    let player: Player;

    beforeEach(() => {
        G = createMockGameState({
            players: {
                '0': {
                    id: '0',
                    name: 'Bot',
                    resources: { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 },
                    settlements: [],
                    cities: [],
                    roads: [],
                    victoryPoints: 0,
                    color: 'red'
                }
            }
        });

        player = G.players['0'];

        coach = new Coach(G);
        (coach.getStrategicAdvice as jest.Mock).mockReturnValue({
            text: 'Test Advice',
            recommendedMoves: []
        });
        // Default Coach behavior
        (coach.getAllSettlementScores as jest.Mock).mockReturnValue([]);
        (coach.getBestCitySpots as jest.Mock).mockReturnValue([]);

        botCoach = new BotCoach(G, coach, BALANCED_PROFILE);
        mockCtx = { currentPlayer: '0' } as Ctx;

        // Reset mocks
        (getAffordableBuilds as jest.Mock).mockReturnValue({
            settlement: false, city: false, road: false, devCard: false
        });
    });

    it('should penalize road building when suffering from road fatigue', () => {
        // Setup: Many roads, few settlements
        player.roads = new Array(10).fill('r');
        player.settlements = ['s1']; // 1 settlement
        // Fatigue condition: 10 > (1 * 2 + 2) = 4. True.

        const moves = [
            mockAction('buildRoad', ['e1']),
            mockAction('endTurn') // Weight 1.0
        ];

        // Road Base Weight ~0.4 (BALANCED).
        // Penalty * 0.1 -> 0.04.
        // EndTurn (1.0) should win.

        const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);
        const actions = result as MakeMoveAction[];

        expect(actions[0].payload.type).toBe('endTurn');
        expect(actions[1].payload.type).toBe('buildRoad');
    });

    it('should NOT penalize road building when ratio is healthy', () => {
        // Setup: Healthy ratio
        player.roads = ['r1', 'r2'];
        player.settlements = ['s1'];
        // Fatigue: 2 > (1 * 2 + 2) = 4. False.

        const moves = [
            mockAction('buildRoad', ['e1']),
            mockAction('endTurn')
        ];

        // We assume BALANCED profile gives Road < EndTurn by default?
        // Let's check BALANCED profile:
        // buildRoad: 0.8
        // endTurn: 1.0 (hardcoded in BotCoach)
        // Wait, BotCoach hardcodes endTurn to 1.0.
        // Profile might have buildRoad < 1.0.
        // To verify "No Penalty", we need to compare against something smaller.
        // Or inject a profile where Road > EndTurn.

        const aggroProfile: BotProfile = {
            ...BALANCED_PROFILE,
            weights: { ...BALANCED_PROFILE.weights, buildRoad: 2.0 }
        };
        const aggroCoach = new BotCoach(G, coach, aggroProfile);

        const result = aggroCoach.filterOptimalMoves(moves, '0', mockCtx);
        const actions = result as MakeMoveAction[];

        // Without penalty, Road (2.0) > EndTurn (1.0)
        expect(actions[0].payload.type).toBe('buildRoad');
    });

    it('should boost settlement building when affordable', () => {
        (getAffordableBuilds as jest.Mock).mockReturnValue({
            settlement: true, city: false, road: false, devCard: false
        });

        // Even if endTurn is 1.0 and buildSettlement base is ~1.2,
        // Boost (x10) should make Settlement ~12.0.

        const moves = [
            mockAction('endTurn'),
            mockAction('buildSettlement', ['v1'])
        ];

        const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);
        const actions = result as MakeMoveAction[];

        expect(actions[0].payload.type).toBe('buildSettlement');
    });

    it('should boost tradeBank when settlement is needed but not affordable', () => {
        (getAffordableBuilds as jest.Mock).mockReturnValue({
            settlement: false, city: false, road: false, devCard: false
        });

        const moves = [
            mockAction('endTurn'), // 1.0
            mockAction('tradeBank') // Base 0.5
        ];

        // Boost condition: !affordable.settlement.
        // Trade Boost x5 -> 0.5 * 5 = 2.5.
        // Trade > EndTurn.

        const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);
        const actions = result as MakeMoveAction[];

        expect(actions[0].payload.type).toBe('tradeBank');
    });

    it('should shuffle road moves to provide variety', () => {
        // Use Aggro profile so Road > EndTurn
        const aggroProfile: BotProfile = {
            ...BALANCED_PROFILE,
            weights: { ...BALANCED_PROFILE.weights, buildRoad: 2.0 }
        };
        const aggroCoach = new BotCoach(G, coach, aggroProfile);

        const moves = [
            mockAction('buildRoad', ['e1']),
            mockAction('buildRoad', ['e2']),
            mockAction('buildRoad', ['e3']),
            mockAction('buildRoad', ['e4']),
            mockAction('buildRoad', ['e5']),
        ];

        // We run this multiple times and expect different orders.
        // Since we mocked Math.random? No, we haven't mocked Math.random yet.
        // It's using real Math.random.

        const results = new Set<string>();
        for (let i = 0; i < 20; i++) {
            const res = aggroCoach.filterOptimalMoves([...moves], '0', mockCtx) as MakeMoveAction[];
            // Capture the first move arg
            results.add(res[0].payload.args[0]);
        }

        // With 5 candidates, checking 20 times, we should see at least 2 different winners.
        expect(results.size).toBeGreaterThan(1);
    });

    it('should ban tradeBank if giving Ore and Ore <= 6 (ORE_RESERVE_THRESHOLD)', () => {
        // Setup: Player has 6 Ore (Max) and 0 Wood (Min).
        // calculateTrade will propose giving Ore for Wood.
        // Threshold is 6, so 6 should be banned.
        player.resources = { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 6 };

        // Ensure settlement is NOT affordable so trade gets boosted normally
        (getAffordableBuilds as jest.Mock).mockReturnValue({
            settlement: false, city: false, road: false, devCard: false
        });

        const moves = [
            mockAction('endTurn'), // 1.0
            mockAction('tradeBank') // Base 0.5 * 5 = 2.5 (Boosted) -> BUT should be banned (0)
        ];

        const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);
        const actions = result as MakeMoveAction[];

        // tradeBank should be penalized to 0, so endTurn (1.0) wins
        expect(actions[0].payload.type).toBe('endTurn');
    });

    it('should ALLOW tradeBank if giving Ore and Ore > 6 (ORE_RESERVE_THRESHOLD)', () => {
        // Setup: Player has 7 Ore.
        player.resources = { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 7 };

        (getAffordableBuilds as jest.Mock).mockReturnValue({
            settlement: false, city: false, road: false, devCard: false
        });

        const moves = [
            mockAction('endTurn'), // 1.0
            mockAction('tradeBank') // Base 0.5 * 5 = 2.5. Allowed.
        ];

        const result = botCoach.filterOptimalMoves(moves, '0', mockCtx);
        const actions = result as MakeMoveAction[];

        // tradeBank is allowed and boosted, so it wins
        expect(actions[0].payload.type).toBe('tradeBank');
    });
});
