import { useMemo } from 'react';
import { Ctx } from 'boardgame.io';
import { UiMode, BuildMode } from '../../shared/types';
import { WIN_EMOJIS, LOSE_EMOJIS, NO_YIELD_EMOJIS, getRandomEmoji } from '../components/constants/emojis';
import {
    getCustomMessage,
    getGameOverMessage,
    getSetupMessage,
    getGameplayMessage,
    CustomMessage,
    StatusMessage
} from '../logic/statusMessageUtils';

export type { CustomMessage };

export function useGameStatusMessage(
    ctx: Ctx,
    playerID: string | null,
    uiMode: UiMode,
    buildMode: BuildMode,
    customMessage?: CustomMessage | null
): StatusMessage {

    // Memoize Game Over Emoji
    const gameOverEmoji = useMemo(() => {
        if (!ctx.gameover) return null;

        if (ctx.gameover.draw) {
            return getRandomEmoji(NO_YIELD_EMOJIS);
        }

        if (ctx.gameover.winner) {
            if (ctx.gameover.winner === playerID) {
                return getRandomEmoji(WIN_EMOJIS);
            } else {
                return getRandomEmoji(LOSE_EMOJIS);
            }
        }

        return null;
    }, [ctx.gameover, playerID]);

    return useMemo(() => {
        // 1. Priority: Custom Message
        if (customMessage) {
            return getCustomMessage(customMessage);
        }

        // 2. Priority: Game Over
        const gameOverMsg = getGameOverMessage(ctx, playerID, gameOverEmoji);
        if (gameOverMsg) {
            return gameOverMsg;
        }

        // 3. Priority: Regular Gameplay
        const isMyTurn = playerID === ctx.currentPlayer;
        if (!isMyTurn) {
            return { message: "Wait for your turn...", colorClass: "text-amber-400" };
        }

        const activeStage = ctx.activePlayers?.[ctx.currentPlayer];

        // Setup Phase
        const setupMsg = getSetupMessage(ctx, activeStage, uiMode);
        if (setupMsg) {
            return setupMsg;
        }

        // Gameplay Phase
        const gameplayMsg = getGameplayMessage(ctx, activeStage, buildMode);
        if (gameplayMsg) {
            return gameplayMsg;
        }

        // Default Fallback
        return { message: "", colorClass: "text-amber-400" };

    }, [ctx, playerID, uiMode, buildMode, customMessage, gameOverEmoji]);
}
