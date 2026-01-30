import { CatanBot } from './CatanBot';
import { GameState } from '../game/core/types';
import { Ctx } from 'boardgame.io';

describe('CatanBot', () => {
    let G: GameState;
    let ctx: Ctx;

    beforeEach(() => {
        G = {
            players: {
                '0': { id: '0', resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, settlements: [], roads: [], victoryPoints: 0, color: 'red', name: 'P1' },
                '1': { id: '1', resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, settlements: [], roads: [], victoryPoints: 0, color: 'blue', name: 'P2' },
            },
        } as any;
        ctx = {
            currentPlayer: '0',
            numPlayers: 2
        } as any;
    });

    test('should return undefined when called for a player whose turn it is not', async () => {
        const mockEnumerate = jest.fn().mockReturnValue([{ move: 'rollDice', args: [] }]);
        const bot = new CatanBot({ enumerate: mockEnumerate });

        // It is player 0's turn
        ctx.currentPlayer = '0';

        // But we call play for player 1
        const result = await bot.play({ G, ctx }, '1');

        expect(result).toBeUndefined();
        // Enumerate should not even be called if we return early
        expect(mockEnumerate).not.toHaveBeenCalled();
    });

    test('should call enumerate and return a move when it is the players turn', async () => {
        const mockEnumerate = jest.fn().mockReturnValue([{ move: 'rollDice', args: [] }]);
        const bot = new CatanBot({ enumerate: mockEnumerate });

        ctx.currentPlayer = '0';
        const result = await bot.play({ G, ctx }, '0');

        expect(result).toBeDefined();
        if (result && typeof result === 'object' && 'action' in result) {
            const action = result.action;
            if (action && typeof action === 'object' && 'payload' in action) {
                 expect(action.payload.type).toBe('rollDice');
            }
        }
        expect(mockEnumerate).toHaveBeenCalledWith(G, ctx, '0');
    });
});
