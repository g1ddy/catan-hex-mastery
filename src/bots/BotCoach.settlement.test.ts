/**
 * @jest-environment jsdom
 */

import { Ctx } from 'boardgame.io';
import { GameState, Player, BotMove } from '../game/types';
import { Coach, CoachRecommendation } from '../game/analysis/coach';
import { BotCoach } from './BotCoach';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';

// Mock the Coach class
jest.mock('../game/analysis/coach');

const MockCoach = Coach as jest.MockedClass<typeof Coach>;

describe('BotCoach Settlement Test', () => {
    let G: GameState;
    let ctx: Ctx;
    let botCoach: BotCoach;
    let mockCoachInstance: jest.Mocked<Coach>;
    let profile: BotProfile;

    beforeEach(() => {
        // A complete and valid mock of the Game State
        G = {
            board: {
                hexes: {},
                vertices: {},
                edges: {},
            },
            players: {
                '0': {
                    id: '0',
                    color: 'red',
                    resources: { wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 4 }, // Sufficient resources
                    victoryPoints: 2,
                    settlements: [],
                    roads: [],
                },
            },
            setupPhase: { activeRound: 1 },
            setupOrder: ['0'],
            lastRoll: [1, 1], // Corrected to be a valid tuple
            lastRollRewards: {},
            hasRolled: false,
            boardStats: {
                totalPips: { wood: 10, brick: 10, sheep: 10, wheat: 10, ore: 10 },
                fairnessScore: 0.9,
                warnings: [],
            },
        };

        // A valid Ctx mock
        ctx = {
            numPlayers: 1,
            currentPlayer: '0',
            phase: 'GAMEPLAY',
            turn: 1,
        } as Ctx;

        profile = { ...BALANCED_PROFILE };
        mockCoachInstance = new MockCoach(G) as jest.Mocked<Coach>;
        botCoach = new BotCoach(G, mockCoachInstance, profile);
    });

    it('should choose the best settlement AND keep other equally weighted moves', () => {
        // Arrange: Make buildSettlement and buyDevCard have the same high weight
        profile.weights.buildSettlement = 10;
        profile.weights.buyDevCard = 10;
        profile.weights.buildRoad = 5; // Lower weight

        const moves: BotMove[] = [
            { move: 'buildSettlement', args: ['0,0,0::1,-1,0'] }, // Spot A
            { move: 'buildSettlement', args: ['1,0,-1::2,-1,-1'] }, // Spot B
            { move: 'buyDevCard', args: [] },
            { move: 'buildRoad', args: ['-1,0,1::-2,1,1'] },
            { move: 'endTurn', args: [] },
        ];

        // A complete mock for the recommendation details
        const mockDetails = {
            pips: 8,
            scarcityBonus: false,
            scarceResources: [],
            diversityBonus: true,
            synergyBonus: false,
            neededResources: ['wood'],
        };
        const recommendations: CoachRecommendation[] = [
            { vertexId: '0,0,0::1,-1,0', score: 10, details: mockDetails, reason: 'test' },
            { vertexId: '1,0,-1::2,-1,-1', score: 15, details: mockDetails, reason: 'test' }, // Spot B is better
        ];
        (mockCoachInstance.getAllSettlementScores as jest.Mock).mockReturnValue(recommendations);

        // Act
        const optimalMoves = botCoach.filterOptimalMoves(moves, '0', ctx);

        // Assert: Should return 2 moves: the best settlement and the dev card
        expect(optimalMoves).toHaveLength(2);

        // Check that the best settlement is present
        const bestSettlementMove = optimalMoves.find(m => (m as BotMove).move === 'buildSettlement');
        expect(bestSettlementMove).toBeDefined();
        expect((bestSettlementMove as BotMove).args).toEqual(['1,0,-1::2,-1,-1']);

        // Check that the other top-weighted move is also present
        const devCardMove = optimalMoves.find(m => (m as BotMove).move === 'buyDevCard');
        expect(devCardMove).toBeDefined();
    });
});
