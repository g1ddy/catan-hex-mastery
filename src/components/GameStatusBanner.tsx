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

    // Otherwise, determine instruction
    let instruction = "";
    const isSetup = ctx.phase === PHASES.SETUP;
    const isGameplay = ctx.phase === PHASES.GAMEPLAY;
    const activeStage = ctx.activePlayers?.[ctx.currentPlayer];
    const isRollingStage = isGameplay && activeStage === STAGES.ROLLING;
    const isActingStage = isGameplay && activeStage === STAGES.ACTING;
    const isMyTurn = playerID === ctx.currentPlayer;

    if (!isMyTurn) {
        instruction = "Wait for your turn...";
    } else if (isSetup) {
        const setupInstructions: Record<string, string> = {
            [STAGES.PLACE_SETTLEMENT]: "Place a Settlement",
            [STAGES.PLACE_ROAD]: "Place a Road",
        };

        if (activeStage && setupInstructions[activeStage]) {
             instruction = uiMode === 'placing' ? setupInstructions[activeStage] : "Select 'Begin Placement' to start";
        } else {
             instruction = "Wait...";
        }
    } else if (isGameplay) {
        if (isRollingStage) {
             instruction = "Roll the Dice";
        } else if (isActingStage) {
            const buildModeInstructions: Record<string, string> = {
                road: "Place a Road",
                settlement: "Place a Settlement",
                city: "Upgrade a Settlement to City",
            };

            instruction = (buildMode && buildModeInstructions[buildMode]) || "Select an Action or End Turn";
        } else {
             // Should cover cases where it's my turn but stage is weird
             instruction = "Wait...";
        }
    }

    // Styling matches ProductionToast container
    return (
        <div data-testid="game-status-banner" className="animate-enter w-fit max-w-[90vw] bg-slate-800/90 backdrop-blur shadow-lg rounded-full pointer-events-auto ring-1 ring-white/10 px-6 py-3 flex items-center justify-center">
            <span className="text-lg font-bold text-amber-400">
                {instruction}
            </span>
        </div>
    );
};
