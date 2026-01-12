/**
 * @jest-environment jsdom
 */

import { Ctx } from 'boardgame.io';
import { GameState, GameAction, Player } from '../game/types';
import { Coach, CoachRecommendation } from '../game/analysis/coach';
import { BotCoach } from './BotCoach';
import { Game } from 'boardgame.io/core';

// Mock the Coach class
jest.mock('../game/analysis/coach');

const MockCoach = Coach as jest.MockedClass<typeof Coach>;

describe('BotCoach settlement selection', () => {
    let G: GameState;
    let ctx: Ctx;
    let botCoach: BotCoach;
    let mockCoachInstance: jest.Mocked<Coach>;

    beforeEach(() => {
        // Basic Game State
        G = {
            board: {
                hexes: {},
                vertices: {},
                edges: {},
            },
            players: {
                '0': {
                    id: '0',
                    name: 'Player 0',
                    color: 'red',
                    resources: { wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 0 },
                    devCards: [],
                    victoryPoints: 2,
                    longestRoad: false,
                    largestArmy: false,
                    settlements: [],
                    roads: [],
                } as Player,
            },
            devCardDeck: [],
            longestRoadOwner: null,
            largestArmyOwner: null,
            diceValue: 7,
            robberHex: '0,0,0',
            turn: 1,
            publicVictoryPoints: { '0': 2 },
            lastRoll: null,
            hasRolled: false,
            boardStats: {},
        };

        // Basic Ctx
        ctx = {
            numPlayers: 1,
            currentPlayer: '0',
            phase: 'GAMEPLAY',
            turn: 1,
            activePlayers: null,
            events: {
                endTurn: jest.fn(),
                setStage: jest.fn(),
                endPhase: jest.fn(),
                endGame: jest.fn(),
                setActivePlayers: jest.fn(),
            },
            random: {
                D6: () => 3,
            } as any,
        };

        // Mock Coach instance and its methods
        mockCoachInstance = new MockCoach(G) as jest.Mocked<Coach>;
        botCoach = new BotCoach(G, mockCoachInstance);
    });

    it('should choose the settlement location with the highest score from the coach', () => {
        // Arrange: Define multiple valid settlement moves
        const moves: GameAction[] = [
            { move: 'buildSettlement', args: ['0,0,0::1,-1,0'] }, // Spot A
            { move: 'buildSettlement', args: ['1,0,-1::2,-1,-1'] }, // Spot B
            { move: 'buildSettlement', args: ['-1,1,0::-1,2,-1'] }, // Spot C
            { move: 'endTurn', args: [] },
        ];

        // Arrange: Mock the coach's scores for these spots
        const recommendations: CoachRecommendation[] = [
            { vertexId: '0,0,0::1,-1,0', score: 10, details: {} }, // Spot A
            { vertexId: '1,0,-1::2,-1,-1', score: 15, details: {} }, // Spot B (highest score)
            { vertexId: '-1,1,0::-1,2,-1', score: 5, details: {} },  // Spot C
        ];

        // The mock setup for getAllSettlementScores needs to be done on the instance
        // that BotCoach will use.
        (mockCoachInstance.getAllSettlementScores as jest.Mock).mockReturnValue(recommendations);


        // Act: Let the bot filter the moves
        const optimalMoves = botCoach.filterOptimalMoves(moves, '0', ctx);

        // Assert: The bot should choose the move with the highest score
        expect(optimalMoves).toHaveLength(1);
        expect(optimalMoves[0].move).toBe('buildSettlement');
        expect(optimalMoves[0].args).toEqual(['1,0,-1::2,-1,-1']); // Should be Spot B
    });
});
