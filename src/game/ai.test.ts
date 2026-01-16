/** @jest-environment jsdom */
import { enumerate } from './ai';
import { GameState } from './types';
import { STAGES } from './constants';

// Mock validator functions
jest.mock('./rules/validator', () => {
    return {
        getValidSetupSettlementSpots: jest.fn(() => new Set(['1_1_1'])),
        getValidSetupRoadSpots: jest.fn(() => new Set(['edge_1'])),
        getValidSettlementSpots: jest.fn(() => new Set(['2_2_2'])),
        getValidCitySpots: jest.fn(() => new Set(['3_3_3'])),
        getValidRoadSpots: jest.fn(() => new Set(['edge_2'])),
        getEdgesForHex: jest.fn(() => []),
        getVerticesForHex: jest.fn(() => []),
        // Mock the new consolidated function
        getValidMovesForStage: jest.fn((_G, ctx, playerID) => {
            const stage = ctx.activePlayers?.[playerID];
            if (stage === 'placeSettlement') {
                return {
                    validSettlements: new Set(['1_1_1']),
                    validCities: new Set(),
                    validRoads: new Set()
                };
            }
            if (stage === 'placeRoad') {
                return {
                    validSettlements: new Set(),
                    validCities: new Set(),
                    validRoads: new Set(['edge_1'])
                };
            }
            if (stage === 'acting') {
                return {
                    validSettlements: new Set(['2_2_2']),
                    validCities: new Set(['3_3_3']),
                    validRoads: new Set(['edge_2'])
                };
            }
            return {
                validSettlements: new Set(),
                validCities: new Set(),
                validRoads: new Set()
            };
        })
    };
});

// Mock costs
jest.mock('./mechanics/costs', () => ({
    getAffordableBuilds: jest.fn(() => ({
        settlement: true,
        city: true,
        road: true,
        devCard: true
    }))
}));

jest.mock('./constants', () => {
    const original = jest.requireActual('./constants');
    return {
        ...original,
        STAGE_MOVES: {
            ...original.STAGE_MOVES,
            'test_single': ['singleMove'],
            'test_multi': ['move1', 'move2']
        }
    };
});

// Helper to create expected action objects
// UPDATED: Now expects simple BotMove objects { move, args }
const expectedAction = (move: string, args: any[] = []) => ({
    move,
    args
});

describe('ai.enumerate', () => {
    let G: GameState;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any;

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
        ctx = {
            activePlayers: { '0': STAGES.ACTING }
        };
    });

    it('should return nothing if stage is unknown', () => {
        ctx.activePlayers = {};
        const moves = enumerate(G, ctx, '0');
        expect(moves).toEqual([]);
    });

    it('should enumerate setup settlements', () => {
        ctx.activePlayers['0'] = STAGES.PLACE_SETTLEMENT;
        const moves = enumerate(G, ctx, '0');
        expect(moves).toContainEqual(expectedAction('placeSettlement', ['1_1_1']));
    });

    it('should enumerate setup roads', () => {
        ctx.activePlayers['0'] = STAGES.PLACE_ROAD;
        const moves = enumerate(G, ctx, '0');
        expect(moves).toContainEqual(expectedAction('placeRoad', ['edge_1']));
    });

    it('should enumerate acting moves', () => {
        const moves = enumerate(G, ctx, '0');
        expect(moves).toContainEqual(expectedAction('buildSettlement', ['2_2_2']));
        expect(moves).toContainEqual(expectedAction('buildCity', ['3_3_3']));
        expect(moves).toContainEqual(expectedAction('buildRoad', ['edge_2']));
        expect(moves).toContainEqual(expectedAction('endTurn', []));
    });

    it('should enumerate rolling', () => {
        ctx.activePlayers['0'] = STAGES.ROLLING;
        const moves = enumerate(G, ctx, '0');
        expect(moves).toEqual([expectedAction('rollDice', [])]);
    });

    it('should enumerate dismissRobber', () => {
        ctx.activePlayers['0'] = STAGES.ROBBER;
        const moves = enumerate(G, ctx, '0');
        expect(moves).toEqual([expectedAction('dismissRobber', [])]);
    });

    it('should auto-generate move for unhandled stage with single move', () => {
        ctx.activePlayers['0'] = 'test_single';
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const moves = enumerate(G, ctx, '0');
        expect(moves).toEqual([expectedAction('singleMove', [])]);
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Stage \'test_single\' not explicitly handled'));
        consoleWarnSpy.mockRestore();
    });

    it('should log error and return empty for unhandled stage with multiple moves', () => {
        ctx.activePlayers['0'] = 'test_multi';
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const moves = enumerate(G, ctx, '0');
        expect(moves).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Stage \'test_multi\' is unhandled'));
        consoleErrorSpy.mockRestore();
    });

    it('should log error for unknown stage (not in STAGE_MOVES)', () => {
        ctx.activePlayers['0'] = 'unknown_stage';
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const moves = enumerate(G, ctx, '0');
        expect(moves).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('is not a recognized fallback stage'));
        consoleErrorSpy.mockRestore();
    });
});
