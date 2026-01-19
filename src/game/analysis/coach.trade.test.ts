/** @jest-environment jsdom */
import { Coach, ORE_RESERVE_THRESHOLD } from './coach';
import { GameState } from '../types';
import { createMockGameState } from '../testUtils';

// We want to test the real calculateTrade integration, so we don't mock it.
// Assuming calculateTrade is pure and works (covered by mechanics tests).

describe('Coach Trade Logic', () => {
    let G: GameState;
    let coach: Coach;

    beforeEach(() => {
        G = createMockGameState({
            players: {
                '0': {
                    id: '0',
                    resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                    settlements: [],
                    cities: [],
                    roads: [],
                    victoryPoints: 0,
                    color: 'blue'
                }
            }
        });
        coach = new Coach(G);
    });

    it('should return unsafe if player cannot afford any trade', () => {
        // This case returns { isSafe: false, reason: "Cannot Afford" }
        // The implementation: if (!canTrade) return { isSafe: false ... }

        G.players['0'].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
        const result = coach.evaluateTrade('0');
        expect(result.isSafe).toBe(false);
        expect(result.reason).toContain('Cannot Afford');
    });

    it('should BAN trade if giving Ore and Ore <= Threshold', () => {
        // Threshold is 6.
        // Setup: 6 Ore (giving), 0 Wood (receiving).
        // calculateTrade gives max (Ore) for min (Wood).
        G.players['0'].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: ORE_RESERVE_THRESHOLD };

        const result = coach.evaluateTrade('0');
        expect(result.isSafe).toBe(false);
        expect(result.reason).toContain('Ore Reserve Low');
    });

    it('should ALLOW trade if giving Ore and Ore > Threshold', () => {
        // Setup: 7 Ore.
        G.players['0'].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: ORE_RESERVE_THRESHOLD + 1 };

        const result = coach.evaluateTrade('0');
        expect(result.isSafe).toBe(true);
    });

    it('should ALLOW trade if giving other resources even if low', () => {
        // Setup: 4 Wood (giving), 0 Ore (receiving).
        // giving Wood. Ore is 0 (very low).
        // But we are not giving Ore, so it should be safe.
        G.players['0'].resources = { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 };

        const result = coach.evaluateTrade('0');
        expect(result.isSafe).toBe(true);
    });
});
