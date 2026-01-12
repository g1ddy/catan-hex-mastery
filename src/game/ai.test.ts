/** @jest-environment jsdom */
import { enumerate } from './ai';
import { GameState } from './types';
import { STAGES } from './constants';

// Mock validator functions
jest.mock('./rules/validator', () => ({
    getValidSetupSettlementSpots: jest.fn(() => new Set(['1_1_1'])),
    getValidSetupRoadSpots: jest.fn(() => new Set(['edge_1'])),
    getValidSettlementSpots: jest.fn(() => new Set(['2_2_2'])),
    getValidCitySpots: jest.fn(() => new Set(['3_3_3'])),
    getValidRoadSpots: jest.fn(() => new Set(['edge_2'])),
    getEdgesForHex: jest.fn(() => []),
    getVerticesForHex: jest.fn(() => [])
}));

// Mock costs
jest.mock('./mechanics/costs', () => ({
    getAffordableBuilds: jest.fn(() => ({
        settlement: true,
        city: true,
        road: true,
        devCard: true
    }))
}));

// Helper to create expected action objects
const expectedAction = (type: string, args: any[] = [], playerID: string = '0') => ({
    type: 'MAKE_MOVE',
    payload: { type, args, playerID }
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
});
