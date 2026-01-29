/** @jest-environment jsdom */
import { enumerate } from './enumerator';
import { GameState, RollStatus } from '../core/types';
import { STAGES } from '../core/constants';
import { RuleEngine } from './validator';

// Mock validator functions
jest.mock('./validator', () => {
    return {
        RuleEngine: {
            validateMove: jest.fn(() => ({ isValid: true }))
        }
    };
});

jest.mock('./queries', () => {
    return {
        getValidSetupSettlementSpots: jest.fn(() => new Set(['1_1_1'])),
        getValidSetupRoadSpots: jest.fn(() => new Set(['edge_1'])),
        getValidSettlementSpots: jest.fn(() => new Set(['2_2_2'])),
        getValidCitySpots: jest.fn(() => new Set(['3_3_3'])),
        getValidRoadSpots: jest.fn(() => new Set(['edge_2'])),
        getValidRobberSpots: jest.fn((G) => {
             // Mimic logic for test: return keys of hexes excluding robberLocation
             if (!G.board || !G.board.hexes) return new Set();
             return new Set(Object.keys(G.board.hexes).filter(id => id !== G.robberLocation));
        }),
        getValidRobberVictims: jest.fn(() => new Set()),
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
        }),
    };
});

// Mock costs
jest.mock('../mechanics/costs', () => ({
    getAffordableBuilds: jest.fn(() => ({
        settlement: true,
        city: true,
        road: true,
        devCard: true
    }))
}));

jest.mock('../core/constants', () => {
    const original = jest.requireActual('../core/constants');
    return {
        ...original,
        STAGE_MOVES: {
            ...original.STAGE_MOVES,
            'test_single': ['rollDice'],
            'test_multi': ['endTurn', 'rollDice']
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
        (RuleEngine.validateMove as jest.Mock).mockReturnValue({ isValid: true });
    });

    afterEach(() => {
        jest.restoreAllMocks();
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
        expect(moves).toContainEqual(expectedAction('tradeBank', []));
        expect(moves).toContainEqual(expectedAction('endTurn', []));
    });

    it('should enumerate rolling when IDLE', () => {
        ctx.activePlayers['0'] = STAGES.ROLLING;
        G.rollStatus = RollStatus.IDLE;

        // Mock RuleEngine to allow rollDice but not resolveRoll when IDLE
        (RuleEngine.validateMove as jest.Mock).mockImplementation((_G, _ctx, moveName) => {
            if (moveName === 'rollDice') return { isValid: true };
            return { isValid: false };
        });

        const moves = enumerate(G, ctx, '0');
        expect(moves).toContainEqual(expectedAction('rollDice', []));
        expect(moves).not.toContainEqual(expectedAction('resolveRoll', []));
    });

    it('should enumerate resolveRoll when ROLLING', () => {
        ctx.activePlayers['0'] = STAGES.ROLLING;
        G.rollStatus = RollStatus.ROLLING;

        // Mock RuleEngine to allow resolveRoll but not rollDice when ROLLING
        (RuleEngine.validateMove as jest.Mock).mockImplementation((_G, _ctx, moveName) => {
            if (moveName === 'resolveRoll') return { isValid: true };
            return { isValid: false };
        });

        const moves = enumerate(G, ctx, '0');
        expect(moves).toContainEqual(expectedAction('resolveRoll', []));
        expect(moves).not.toContainEqual(expectedAction('rollDice', []));
    });

    it('should enumerate dismissRobber with valid targets', () => {
        ctx.activePlayers['0'] = STAGES.ROBBER;
        // Mock board with hexes A, B, C
        G.board = {
            hexes: {
                'A': { coords: { q: 0, r: 0, s: 0 } },
                'B': { coords: { q: 1, r: -1, s: 0 } },
                'C': { coords: { q: -1, r: 1, s: 0 } }
            },
            vertices: {},
            edges: {}
        } as any;
        G.robberLocation = 'A';

        const moves = enumerate(G, ctx, '0');

        // Should contain B and C, but NOT A
        expect(moves).toHaveLength(2);
        expect(moves).toContainEqual(expectedAction('dismissRobber', ['B']));
        expect(moves).toContainEqual(expectedAction('dismissRobber', ['C']));
        expect(moves).not.toContainEqual(expectedAction('dismissRobber', ['A']));
    });

    it('should correctly enumerate single moves from custom stages', () => {
        ctx.activePlayers['0'] = 'test_single';
        const moves = enumerate(G, ctx, '0');
        expect(moves).toEqual([expectedAction('rollDice', [])]);
    });

    it('should correctly enumerate multiple moves from custom stages', () => {
        ctx.activePlayers['0'] = 'test_multi';
        const moves = enumerate(G, ctx, '0');

        // Should contain both moves
        expect(moves).toHaveLength(2);
        expect(moves).toContainEqual(expectedAction('endTurn', []));
        expect(moves).toContainEqual(expectedAction('rollDice', []));
    });

    it('should log error for unknown stage (not in STAGE_MOVES)', () => {
        ctx.activePlayers['0'] = 'unknown_stage';
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const moves = enumerate(G, ctx, '0');
        expect(moves).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No moves defined for stage: unknown_stage'));
    });
});
