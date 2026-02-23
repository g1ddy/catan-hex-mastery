import { Ctx } from 'boardgame.io';
import {
    getCustomMessage,
    getGameOverMessage,
    getSetupMessage,
    getGameplayMessage,
    CustomMessage
} from './statusMessageUtils';
import { PHASES, STAGES } from '../../../game/core/constants';
import { LOSE_EMOJIS } from '../components/constants/emojis';

describe('statusMessageUtils', () => {

    describe('getCustomMessage', () => {
        it('should return correct message and color for success', () => {
            const custom: CustomMessage = { text: 'Great Job!', type: 'success' };
            const result = getCustomMessage(custom);
            expect(result).toEqual({ message: 'Great Job!', colorClass: 'text-green-400' });
        });

        it('should return correct message and color for error', () => {
            const custom: CustomMessage = { text: 'Failed!', type: 'error' };
            const result = getCustomMessage(custom);
            expect(result).toEqual({ message: 'Failed!', colorClass: 'text-red-400' });
        });

        it('should return correct message and color for info', () => {
            const custom: CustomMessage = { text: 'Info', type: 'info' };
            const result = getCustomMessage(custom);
            expect(result).toEqual({ message: 'Info', colorClass: 'text-amber-400' });
        });
    });

    describe('getGameOverMessage', () => {
        const mockCtx = {
            gameover: null
        } as unknown as Ctx;

        it('should return null if game is not over', () => {
            expect(getGameOverMessage(mockCtx, '0', null)).toBeNull();
        });

        it('should return draw message', () => {
            const ctx = { ...mockCtx, gameover: { draw: true } } as unknown as Ctx;
            const result = getGameOverMessage(ctx, '0', '😐');
            expect(result?.message).toContain('Draw!');
            expect(result?.message).toContain('😐');
            expect(result?.colorClass).toBe('text-slate-200');
        });

        it('should return win message', () => {
            const ctx = { ...mockCtx, gameover: { winner: '0' } } as unknown as Ctx;
            const result = getGameOverMessage(ctx, '0', '🏆');
            expect(result?.message).toContain('You Win!!!');
            expect(result?.message).toContain('🏆');
            expect(result?.colorClass).toContain('text-amber-400');
        });

        it('should return lose message', () => {
            const ctx = { ...mockCtx, gameover: { winner: '1' } } as unknown as Ctx;
            const result = getGameOverMessage(ctx, '0', '💀');
            expect(result?.message).toContain('You Lose');
            expect(result?.message).toContain('💀');
            expect(result?.colorClass).toBe('text-red-400');
        });
    });

    describe('getSetupMessage', () => {
        it('should return null if not setup phase', () => {
            const ctx = { phase: PHASES.GAMEPLAY } as unknown as Ctx;
            expect(getSetupMessage(ctx, STAGES.PLACE_SETTLEMENT, 'viewing')).toBeNull();
        });

        it('should return placement instruction in placing mode', () => {
            const ctx = { phase: PHASES.SETUP } as unknown as Ctx;
            const result = getSetupMessage(ctx, STAGES.PLACE_SETTLEMENT, 'placing');
            expect(result?.message).toBe('Place Settlement');
            expect(result?.colorClass).toBe('text-amber-400');
        });

        it('should return "Start Placement" if not in placing mode', () => {
            const ctx = { phase: PHASES.SETUP } as unknown as Ctx;
            const result = getSetupMessage(ctx, STAGES.PLACE_SETTLEMENT, 'viewing');
            expect(result?.message).toBe('Start Placement');
        });

        it('should return "Waiting..." for unknown stage', () => {
             const ctx = { phase: PHASES.SETUP } as unknown as Ctx;
             const result = getSetupMessage(ctx, 'unknown_stage', 'viewing');
             expect(result?.message).toBe('Waiting...');
        });
    });

    describe('getGameplayMessage', () => {
        it('should return null if not gameplay phase', () => {
            const ctx = { phase: PHASES.SETUP } as unknown as Ctx;
            expect(getGameplayMessage(ctx, STAGES.ROLLING, null)).toBeNull();
        });

        it('should return "Roll Dice" for rolling stage', () => {
            const ctx = { phase: PHASES.GAMEPLAY } as unknown as Ctx;
            const result = getGameplayMessage(ctx, STAGES.ROLLING, null);
            expect(result?.message).toBe('Roll Dice');
        });

        it('should return build instruction in acting stage with build mode', () => {
            const ctx = { phase: PHASES.GAMEPLAY } as unknown as Ctx;
            const result = getGameplayMessage(ctx, STAGES.ACTING, 'road');
            expect(result?.message).toBe('Place Road');
        });

        it('should return "Your Turn" in acting stage without build mode', () => {
            const ctx = { phase: PHASES.GAMEPLAY } as unknown as Ctx;
            const result = getGameplayMessage(ctx, STAGES.ACTING, null);
            expect(result?.message).toBe('Your Turn');
        });

        it('should return Robber message', () => {
             const ctx = { phase: PHASES.GAMEPLAY } as unknown as Ctx;
             const result = getGameplayMessage(ctx, STAGES.ROBBER, null);
             expect(result?.message).toContain('Robber!');
             expect(result?.colorClass).toContain('text-red-400');
             // Verify emoji is one of LOSE_EMOJIS
             const emoji = result?.message.replace('Robber! ', '');
             expect(LOSE_EMOJIS).toContain(emoji);
        });

         it('should return "Waiting..." for unknown stage', () => {
             const ctx = { phase: PHASES.GAMEPLAY } as unknown as Ctx;
             const result = getGameplayMessage(ctx, 'unknown_stage', null);
             expect(result?.message).toBe('Waiting...');
        });
    });
});
