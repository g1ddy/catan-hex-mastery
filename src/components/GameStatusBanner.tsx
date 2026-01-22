import React, { useEffect, useMemo } from 'react';
import { Ctx } from 'boardgame.io';
import { UiMode, BuildMode } from './GameControls';
import { PHASES, STAGES } from '../game/core/constants';
import { WIN_EMOJIS, LOSE_EMOJIS, NO_YIELD_EMOJIS, getRandomEmoji } from '../constants/emojis';

export interface CustomMessage {
    text: string;
    type: 'success' | 'info' | 'error';
}

interface GameStatusBannerProps {
    ctx: Ctx;
    playerID: string | null;
    uiMode: UiMode;
    buildMode: BuildMode;
    customMessage?: CustomMessage | null;
    onCustomMessageClear?: () => void;
    customMessageDuration?: number;
}

export const GameStatusBanner: React.FC<GameStatusBannerProps> = ({
    ctx,
    playerID,
    uiMode,
    buildMode,
    customMessage,
    onCustomMessageClear,
    customMessageDuration = 3000
}) => {
    // Auto-clear custom message
    useEffect(() => {
        if (customMessage && onCustomMessageClear) {
            const timer = setTimeout(() => {
                onCustomMessageClear();
            }, customMessageDuration);
            return () => clearTimeout(timer);
        }
    }, [customMessage, onCustomMessageClear, customMessageDuration]);

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

    let message = "";
    let colorClass = "text-amber-400"; // Default color

    if (customMessage) {
        message = customMessage.text;
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
    } else if (ctx.gameover) {
        message = "Game Over";
        colorClass = "text-slate-200";

        if (ctx.gameover.draw) {
            message = `Draw! ${gameOverEmoji}`;
            colorClass = "text-slate-200";
        } else if (ctx.gameover.winner) {
            if (ctx.gameover.winner === playerID) {
                message = `You Win!!! ${gameOverEmoji}`;
                colorClass = "text-amber-400 animate-pulse motion-reduce:animate-none";
            } else {
                message = `You Lose ${gameOverEmoji}`;
                colorClass = "text-red-400";
            }
        }
    } else {
        // Regular Gameplay Logic
        const isSetup = ctx.phase === PHASES.SETUP;
        const isGameplay = ctx.phase === PHASES.GAMEPLAY;
        const activeStage = ctx.activePlayers?.[ctx.currentPlayer];
        const isRollingStage = isGameplay && activeStage === STAGES.ROLLING;
        const isActingStage = isGameplay && activeStage === STAGES.ACTING;
        const isRobberStage = isGameplay && activeStage === STAGES.ROBBER;
        const isMyTurn = playerID === ctx.currentPlayer;

        if (!isMyTurn) {
            message = "Wait for your turn...";
        } else if (isSetup) {
            const setupInstructions: Record<string, string> = {
                [STAGES.PLACE_SETTLEMENT]: "Place Settlement",
                [STAGES.PLACE_ROAD]: "Place Road",
            };

            if (activeStage && setupInstructions[activeStage]) {
                message = uiMode === 'placing' ? setupInstructions[activeStage] : "Start Placement";
            } else {
                message = "Waiting...";
            }
        } else if (isGameplay) {
            if (isRollingStage) {
                message = "Roll Dice";
            } else if (isActingStage) {
                const buildModeInstructions: Record<string, string> = {
                    road: "Place Road",
                    settlement: "Place Settlement",
                    city: "Build City",
                };

                message = (buildMode && buildModeInstructions[buildMode]) || "Your Turn";
            } else if (isRobberStage) {
                message = `Robber! ${getRandomEmoji(LOSE_EMOJIS)}`;
                colorClass = "text-red-400 font-bold animate-bounce";
            } else {
                message = "Waiting...";
            }
        }
    }

    // Unified Return
    return (
        <div
            data-testid="game-status-banner"
            role="status"
            aria-live="polite"
            className="animate-enter w-fit max-w-[60vw] md:max-w-fit bg-slate-800/90 backdrop-blur shadow-lg rounded-full pointer-events-auto ring-1 ring-white/10 px-6 py-3 flex items-center justify-center"
        >
            <span className={`text-lg font-bold truncate ${colorClass}`}>
                {message}
            </span>
        </div>
    );
};
