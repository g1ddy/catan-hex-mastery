/** @jest-environment jsdom */
import { GameContext } from '../../game/core/types';
import { Coach } from './coach';
import { ORE_RESERVE_THRESHOLD } from './adviceConstants';
import { GameState } from '../core/types';
import { createMockGameState } from '../testUtils';

describe('Coach Trade Logic', () => {
    let G: GameState;
    let coach: Coach;
    let mockGameContext: GameContext;

    beforeEach(() => {
        G = createMockGameState({
            players: {
                '0': {
                    id: '0',
                    name: 'Player 0',
                    resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                    settlements: [],
                    roads: [],
                    victoryPoints: 0,
                    color: 'blue'
                }
            }
        });
        coach = new Coach(G);
        mockGameContext = { currentPlayer: '0' } as GameContext;
    });

    it('should return unsafe if player cannot afford any trade', () => {
        G.players['0'].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
        const result = coach.evaluateTrade('0', mockGameContext);
        expect(result.isSafe).toBe(false);
        expect(result.reason).toContain('Cannot Afford');
    });

    it('should BAN trade if giving Ore and Ore <= Threshold', () => {
        G.players['0'].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: ORE_RESERVE_THRESHOLD };

        const result = coach.evaluateTrade('0', mockGameContext);
        expect(result.isSafe).toBe(false);
        expect(result.reason).toContain('Ore Reserve Low');
    });

    it('should ALLOW trade if giving Ore and Ore > Threshold', () => {
        G.players['0'].resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: ORE_RESERVE_THRESHOLD + 1 };

        const result = coach.evaluateTrade('0', mockGameContext);
        expect(result.isSafe).toBe(true);
    });

    it('should ALLOW trade if giving other resources even if low', () => {
        G.players['0'].resources = { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 };

        const result = coach.evaluateTrade('0', mockGameContext);
        expect(result.isSafe).toBe(true);
    });
});
