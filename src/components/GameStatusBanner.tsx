import React, { useState, useEffect } from 'react';
import { GameState } from '../game/types';
import { Ctx } from 'boardgame.io';
import { UiMode, BuildMode } from './GameControls';
import { ProductionToast } from './ProductionToast';
import { PHASES, STAGES } from '../game/constants';

interface GameStatusBannerProps {
    G: GameState;
    ctx: Ctx;
    playerID: string | null;
    uiMode: UiMode;
    buildMode: BuildMode;
}

export const GameStatusBanner: React.FC<GameStatusBannerProps> = ({ G, ctx, playerID, uiMode, buildMode }) => {
    const [showRollResult, setShowRollResult] = useState(false);

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

    // Game Over Logic
    if (ctx.gameover) {
        let msg = "Game Over";
        let colorClass = "text-slate-200";

        if (ctx.gameover.draw) {
            msg = "Draw!";
            colorClass = "text-slate-200";
        } else if (ctx.gameover.winner) {
            if (ctx.gameover.winner === playerID) {
                msg = "You Win!!!";
                colorClass = "text-amber-400 animate-pulse";
            } else {
                msg = "You Lose";
                colorClass = "text-red-400";
            }
        }

        return (
             <div data-testid="game-status-banner" className="animate-enter w-fit max-w-[60vw] md:max-w-fit bg-slate-800/90 backdrop-blur shadow-lg rounded-full pointer-events-auto ring-1 ring-white/10 px-6 py-3 flex items-center justify-center">
                <span className={`text-lg font-bold ${colorClass}`}>
                    {msg}
                </span>
            </div>
        );
    }

    // Otherwise, determine instruction
    let instruction = "";
    const isSetup = ctx.phase === PHASES.SETUP;
    const isGameplay = ctx.phase === PHASES.GAMEPLAY;
    const activeStage = ctx.activePlayers?.[ctx.currentPlayer];
    const isRollingStage = isGameplay && activeStage === STAGES.ROLLING;
    const isActingStage = isGameplay && activeStage === STAGES.ACTING;
    const isMyTurn = playerID === ctx.currentPlayer;

    if (!isMyTurn) {
        instruction = "Wait...";
    } else if (isSetup) {
        const setupInstructions: Record<string, string> = {
            [STAGES.PLACE_SETTLEMENT]: "Place Settlement",
            [STAGES.PLACE_ROAD]: "Place Road",
        };

        if (activeStage && setupInstructions[activeStage]) {
             instruction = uiMode === 'placing' ? setupInstructions[activeStage] : "Start Placement";
        } else {
             instruction = "Wait...";
        }
    } else if (isGameplay) {
        if (isRollingStage) {
             instruction = "Roll Dice";
        } else if (isActingStage) {
            const buildModeInstructions: Record<string, string> = {
                road: "Place Road",
                settlement: "Place Settlement",
                city: "Build City",
            };

            instruction = (buildMode && buildModeInstructions[buildMode]) || "Your Turn";
        } else {
             // Should cover cases where it's my turn but stage is weird
             instruction = "Wait...";
        }
    }

    // Styling matches ProductionToast container
    // Added truncate to prevent overflow if text is somehow still too long
    return (
        <div data-testid="game-status-banner" className="animate-enter w-fit max-w-[60vw] md:max-w-fit bg-slate-800/90 backdrop-blur shadow-lg rounded-full pointer-events-auto ring-1 ring-white/10 px-6 py-3 flex items-center justify-center">
            <span className="text-lg font-bold text-amber-400 truncate">
                {instruction}
            </span>
        </div>
    );
};
