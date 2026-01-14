import { buildRoad, buildSettlement, buildCity } from './build';
import { placeRoad, placeSettlement } from './setup';
import { GameState } from '../types';
import { Ctx } from 'boardgame.io';
import * as _ from 'lodash';

type MoveFn = (args: { G: GameState; ctx: Ctx }, ...payload: unknown[]) => unknown;

describe('Security Validation: Input Sanitization', () => {
    const mockContext: Ctx = { currentPlayer: '0' } as Ctx;

    const baseG: GameState = {
        players: {
            '0': {
                id: '0',
                color: 'red',
                resources: { wood: 10, brick: 10, wheat: 10, sheep: 10, ore: 10 },
                roads: [],
                settlements: [],
                victoryPoints: 0,
            },
        },
        board: { edges: {}, vertices: {}, hexes: {} },
        setupPhase: { activeRound: 1 },
        setupOrder: ['0', '1'],
        lastRoll: [0, 0],
        lastRollRewards: {},
        boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
        hasRolled: false,
        robberLocation: '0',
    };

    let G: GameState;

    beforeEach(() => {
        G = _.cloneDeep(baseG);
    });

    const maliciousInputs = [
        '__proto__',
        'constructor',
        'prototype',
        '<script>alert(1)</script>',
        'invalid-id',
        '1,2,3,4', // too many coords
        '1,2', // too few
        '1,2,a', // non-numeric
        '1,1,1', // geometric violation (sum != 0)
        '1,2,-3::4,5,-9::'.repeat(100), // excessively long string
    ];

    describe('Build Moves', () => {
        maliciousInputs.forEach(input => {
            it(`buildRoad should reject malicious input: ${input}`, () => {
                const call = () => (buildRoad as MoveFn)({ G, ctx: mockContext }, input);
                expect(call).toThrow("Invalid edge ID format");
            });

            it(`buildSettlement should reject malicious input: ${input}`, () => {
                const call = () => (buildSettlement as MoveFn)({ G, ctx: mockContext }, input);
                expect(call).toThrow("Invalid vertex ID format");
            });

            it(`buildCity should reject malicious input: ${input}`, () => {
                const call = () => (buildCity as MoveFn)({ G, ctx: mockContext }, input);
                expect(call).toThrow("Invalid vertex ID format");
            });
        });
    });

    describe('Setup Moves', () => {
        maliciousInputs.forEach(input => {
            it(`placeRoad should reject malicious input: ${input}`, () => {
                const call = () => (placeRoad as MoveFn)({ G, ctx: mockContext }, input);
                expect(call).toThrow("Invalid edge ID format");
            });

            it(`placeSettlement should reject malicious input: ${input}`, () => {
                const call = () => (placeSettlement as MoveFn)({ G, ctx: mockContext }, input);
                expect(call).toThrow("Invalid vertex ID format");
            });
        });
    });
});
