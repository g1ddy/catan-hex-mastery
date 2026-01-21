import { tradeBank } from './trade';
import { createMockGameState } from '../testUtils';
import { Ctx } from 'boardgame.io';

describe('Trade Logic', () => {
    describe('tradeBank Move', () => {
        it('should execute trade correctly', () => {
            const G = createMockGameState({
                players: {
                    '0': {
                        id: '0',
                        name: 'Player 0',
                        color: 'blue',
                        resources: {
                            wood: 5,
                            brick: 0,
                            sheep: 2,
                            wheat: 3,
                            ore: 1
                        },
                        settlements: [],
                        roads: [],
                        victoryPoints: 0
                    }
                }
            });

            const ctx = { currentPlayer: '0' } as Ctx;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (tradeBank as any)({ G, ctx }, 'wood', 'brick');

            const player = G.players['0'];
            expect(player.resources.wood).toBe(1); // 5 - 4
            expect(player.resources.brick).toBe(1); // 0 + 1
        });

        it('should throw error if trade is invalid', () => {
            const G = createMockGameState({
                players: {
                    '0': {
                        id: '0',
                        name: 'Player 0',
                        color: 'blue',
                        resources: {
                            wood: 3,
                            brick: 3,
                            sheep: 3,
                            wheat: 3,
                            ore: 3
                        },
                        settlements: [],
                        roads: [],
                        victoryPoints: 0
                    }
                }
            });

            const ctx = { currentPlayer: '0' } as Ctx;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => (tradeBank as any)({ G, ctx }, 'wood', 'brick')).toThrow("You need at least 4 of a resource to trade.");
        });
    });
});
