import React, { useState, useEffect } from 'react';
import { GameState } from '../game/types';
import { Ctx } from 'boardgame.io';
import { UiMode, BuildMode } from './GameControls';
import { ProductionToast } from './ProductionToast';
import { PHASES, STAGES } from '../game/constants';

export interface CustomMessage {
    text: string;
    type: 'success' | 'info' | 'error';
}

interface GameStatusBannerProps {
    G: GameState;
    ctx: Ctx;
    playerID: string | null;
    uiMode: UiMode;
    buildMode: BuildMode;
    customMessage?: CustomMessage | null;
    onCustomMessageClear?: () => void;
    customMessageDuration?: number;
}

export const GameStatusBanner: React.FC<GameStatusBannerProps> = ({
    G,
    ctx,
    playerID,
    uiMode,
    buildMode,
    customMessage,
    onCustomMessageClear,
    customMessageDuration = 3000
}) => {
    const [showRollResult, setShowRollResult] = useState(false);

    // Auto-clear custom message
    useEffect(() => {
        if (customMessage && onCustomMessageClear) {
            const timer = setTimeout(() => {
                onCustomMessageClear();
            }, customMessageDuration);
            return () => clearTimeout(timer);
        }
    }, [customMessage, onCustomMessageClear, customMessageDuration]);

    // Calculate roll sum once
    const [d1, d2] = G.lastRoll;
    const sum = d1 + d2;

    // Watch for new rolls
    useEffect(() => {
        if (sum > 0) {
            setShowRollResult(true);
            const timer = setTimeout(() => setShowRollResult(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [G.lastRoll, sum]); // Depend on G.lastRoll and derived sum

    // If showing roll result, render ProductionToast (reused)
    if (showRollResult) {
        return <ProductionToast G={G} sum={sum} visible={true} />;
    }

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
            message = "Draw!";
            colorClass = "text-slate-200";
        } else if (ctx.gameover.winner) {
            if (ctx.gameover.winner === playerID) {
                message = "You Win!!!";
                colorClass = "text-amber-400 animate-pulse";
            } else {
                message = "You Lose";
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
