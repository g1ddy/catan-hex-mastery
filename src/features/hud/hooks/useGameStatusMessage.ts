import { useMemo } from 'react';
import { Ctx } from 'boardgame.io';
import { UiMode, BuildMode } from '../../shared/types';
import { PHASES, STAGES } from '../../../game/core/constants';
import { WIN_EMOJIS, LOSE_EMOJIS, NO_YIELD_EMOJIS, getRandomEmoji } from '../components/constants/emojis';

export interface CustomMessage {
    text: string;
    type: 'success' | 'info' | 'error';
}

export function useGameStatusMessage(
    ctx: Ctx,
    playerID: string | null,
    uiMode: UiMode,
    buildMode: BuildMode,
    customMessage?: CustomMessage | null
): { message: string; colorClass: string } {

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
            let colorClass = "text-amber-400";
            switch (customMessage.type) {
                case 'success':
                    colorClass = "text-green-400";
                    break;
                case 'error':
                    colorClass = "text-red-400";
                    break;
                case 'info':
                default:
                    colorClass = "text-amber-400";
                    break;
            }
            return { message: customMessage.text, colorClass };
        }

        // 2. Priority: Game Over
        if (ctx.gameover) {
            if (ctx.gameover.draw) {
                return {
                    message: `Draw! ${gameOverEmoji}`,
                    colorClass: "text-slate-200"
                };
            }
            if (ctx.gameover.winner) {
                if (ctx.gameover.winner === playerID) {
                    return {
                        message: `You Win!!! ${gameOverEmoji}`,
                        colorClass: "text-amber-400 animate-pulse motion-reduce:animate-none"
                    };
                } else {
                    return {
                        message: `You Lose ${gameOverEmoji}`,
                        colorClass: "text-red-400"
                    };
                }
            }
            return { message: "Game Over", colorClass: "text-slate-200" };
        }

        // 3. Priority: Regular Gameplay
        const isMyTurn = playerID === ctx.currentPlayer;
        if (!isMyTurn) {
            return { message: "Wait for your turn...", colorClass: "text-amber-400" };
        }

        const activeStage = ctx.activePlayers?.[ctx.currentPlayer];

        // Setup Phase
        if (ctx.phase === PHASES.SETUP) {
            const setupInstructions: Record<string, string> = {
                [STAGES.PLACE_SETTLEMENT]: "Place Settlement",
                [STAGES.PLACE_ROAD]: "Place Road",
            };

            if (activeStage && setupInstructions[activeStage]) {
                const message = uiMode === 'placing' ? setupInstructions[activeStage] : "Start Placement";
                return { message, colorClass: "text-amber-400" };
            }
            return { message: "Waiting...", colorClass: "text-amber-400" };
        }

        // Gameplay Phase
        if (ctx.phase === PHASES.GAMEPLAY) {
            if (activeStage === STAGES.ROLLING) {
                return { message: "Roll Dice", colorClass: "text-amber-400" };
            }

            if (activeStage === STAGES.ACTING) {
                const buildModeInstructions: Record<string, string> = {
                    road: "Place Road",
                    settlement: "Place Settlement",
                    city: "Build City",
                };
                const message = (buildMode && buildModeInstructions[buildMode]) || "Your Turn";
                return { message, colorClass: "text-amber-400" };
            }

            if (activeStage === STAGES.ROBBER) {
                return {
                    message: `Robber! ${getRandomEmoji(LOSE_EMOJIS)}`,
                    colorClass: "text-red-400 font-bold animate-bounce"
                };
            }

            return { message: "Waiting...", colorClass: "text-amber-400" };
        }

        // Default Fallback
        return { message: "", colorClass: "text-amber-400" };

    }, [ctx, playerID, uiMode, buildMode, customMessage, gameOverEmoji]);
}
