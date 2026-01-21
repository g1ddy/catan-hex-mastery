/**
 * @jest-environment jsdom
 */

import { Ctx } from 'boardgame.io';
import { GameState, BotMove, RollStatus } from '../game/types';
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
                ports: {},
            },
            players: {
                '0': {
                    id: '0',
                    name: 'Player 1',
                    color: 'red',
                    resources: { wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 4 }, // Sufficient resources
                    victoryPoints: 2,
                    settlements: [],
                    roads: [],
                },
            },
            setupPhase: { activeRound: 1 },
            setupOrder: ['0'],
            lastRoll: [1, 1],
            rollStatus: RollStatus.IDLE,
            boardStats: {
                totalPips: { wood: 10, brick: 10, sheep: 10, wheat: 10, ore: 10 },
                fairnessScore: 0.9,
                warnings: [],
            },
            robberLocation: '0,0,0',
            playersToDiscard: [],
            notification: null,
        };

        ctx = {
            numPlayers: 1,
            currentPlayer: '0',
            phase: 'GAMEPLAY',
            turn: 1,
        } as Ctx;

        profile = { ...BALANCED_PROFILE };
        mockCoachInstance = new MockCoach(G) as jest.Mocked<Coach>;

        (mockCoachInstance.getStrategicAdvice as jest.Mock).mockReturnValue({
            text: 'Test Advice',
            recommendedMoves: []
        });

        botCoach = new BotCoach(G, mockCoachInstance, profile);
    });

    it('should choose the best settlement AND keep other equally weighted moves', () => {
        profile.weights.buildSettlement = 10;
        profile.weights.buyDevCard = 10;
        profile.weights.buildRoad = 5;

        const moves: BotMove[] = [
            { move: 'buildSettlement', args: ['0,0,0::1,-1,0'] },
            { move: 'buildSettlement', args: ['1,0,-1::2,-1,-1'] },
            { move: 'buyDevCard', args: [] },
            { move: 'buildRoad', args: ['-1,0,1::-2,1,1'] },
            { move: 'endTurn', args: [] },
        ];

        const mockDetails = {
            pips: 8, scarcityBonus: false, scarceResources: [], diversityBonus: true,
            synergyBonus: false, neededResources: ['wood'],
        };
        const recommendations: CoachRecommendation[] = [
            { vertexId: '0,0,0::1,-1,0', score: 10, details: mockDetails, reason: 'test' },
            { vertexId: '1,0,-1::2,-1,-1', score: 15, details: mockDetails, reason: 'test' },
        ];
        (mockCoachInstance.getAllSettlementScores as jest.Mock).mockReturnValue(recommendations);

        const optimalMoves = botCoach.filterOptimalMoves(moves, '0', ctx);

        const topMoves = optimalMoves.slice(0, 3).map(m => (m as BotMove).move);
        expect(topMoves).toContain('buildSettlement');
        expect(topMoves).toContain('buyDevCard');

        const settlementMoves = optimalMoves.filter(m => (m as BotMove).move === 'buildSettlement');
        expect((settlementMoves[0] as BotMove).args[0]).toBe('1,0,-1::2,-1,-1');
    });
});
