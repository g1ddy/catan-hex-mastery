import React, { useState, useEffect } from 'react';
import { GameState, Resources } from '../game/types';
import { BUILD_COSTS } from '../game/config';
import { Dices as Dice, ArrowRight, Loader2 } from 'lucide-react';
import { Ctx } from 'boardgame.io';
import { BUILD_BUTTON_CONFIG } from './uiConfig';
import { PHASES, STAGES, STAGE_MOVES } from '../game/constants';
import { safeMove } from '../utils/moveUtils';

export type BuildMode = 'road' | 'settlement' | 'city' | null;
export type UiMode = 'viewing' | 'placing';

export interface GameControlsProps {
    G: GameState;
    ctx: Ctx;
    moves: {
        rollDice: () => void;
        endTurn: () => void;
    };
    buildMode: BuildMode;
    setBuildMode: (mode: BuildMode) => void;
    uiMode: UiMode;
    setUiMode: (mode: UiMode) => void;
    className?: string;
}

const BeginPlacementButton: React.FC<{ onClick: () => void, className?: string }> = ({ onClick, className }) => (
    <button
        onClick={onClick}
        className={className}
    >
        <span className={className?.includes('text-lg') ? "text-lg font-bold" : "text-base font-bold"}>Begin Placement</span>
    </button>
);

export const GameControls: React.FC<GameControlsProps> = ({ G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, className = '' }) => {
    const isSetup = ctx.phase === PHASES.SETUP;
    const isGameplay = ctx.phase === PHASES.GAMEPLAY;

    const activeStage = ctx.activePlayers?.[ctx.currentPlayer];
    const isRollingStage = isGameplay && activeStage === STAGES.ROLLING;

    const [isRolling, setIsRolling] = useState(false);
    const [isEndingTurn, setIsEndingTurn] = useState(false);

    useEffect(() => {
        setIsRolling(false);
        setIsEndingTurn(false);
    }, [ctx.currentPlayer, ctx.phase, activeStage]);

    // Setup Phase
    if (isSetup) {
        let canInteract = false;

        if (activeStage === STAGES.PLACE_SETTLEMENT) {
            canInteract = true;
        }
        if (activeStage === STAGES.PLACE_ROAD) {
            canInteract = true;
        }

        const handleClick = () => {
            if (canInteract && uiMode === 'viewing') {
                setUiMode('placing');
            }
        };

        if (uiMode === 'viewing') {
             return (
                <div className={`flex-grow flex pointer-events-auto ${className}`}>
                    <BeginPlacementButton
                        onClick={handleClick}
                        className="w-full h-full flex items-center justify-center text-white px-4 py-3 bg-blue-600 hover:bg-blue-500 backdrop-blur-md border border-blue-400/50 rounded-xl shadow-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none animate-pulse"
                    />
                </div>
             );
        }

        return (
             <div className={`flex-grow flex pointer-events-auto ${className}`}>
                 <button
                    onClick={() => setUiMode('viewing')}
                    className="w-full h-full flex items-center justify-center text-slate-300 px-4 py-3 bg-slate-800/90 hover:bg-slate-700 backdrop-blur-md border border-slate-700 rounded-xl shadow-lg transition-all active:scale-95"
                 >
                     <span className="text-base font-semibold">Cancel Placement</span>
                 </button>
             </div>
        );
    }

    if (isGameplay) {
        const resources = G.players[ctx.currentPlayer].resources;

        // Helper to check if a move is allowed in the current stage
        const isMoveAllowed = (moveName: string): boolean => {
            const allowedMoves = activeStage && STAGE_MOVES[activeStage as keyof typeof STAGE_MOVES];
            return !!allowedMoves && (allowedMoves as readonly string[]).includes(moveName);
        };

        // Build Button Logic
        const canAfford = (cost: Partial<Resources>): boolean => {
            return (Object.keys(cost) as Array<keyof Resources>).every(
                resource => resources[resource] >= (cost[resource] || 0)
            );
        };

        const affordMap = {
            road: canAfford(BUILD_COSTS.road),
            settlement: canAfford(BUILD_COSTS.settlement),
            city: canAfford(BUILD_COSTS.city)
        };

        const moveNameMap: Record<string, string> = {
            road: 'buildRoad',
            settlement: 'buildSettlement',
            city: 'buildCity'
        };

        const costString = (type: keyof typeof BUILD_COSTS) => {
             const cost = BUILD_COSTS[type];
             const parts = Object.entries(cost).map(([res, amt]) => `${amt} ${res.charAt(0).toUpperCase() + res.slice(1)}`);
             return `Cost: ${parts.join(', ')}`;
        };

        const getButtonClass = (mode: BuildMode) => {
            const base = "focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none";
            if (buildMode === mode) return `${base} bg-amber-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.5)]`;
            return `${base} bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed`;
        };

        const toggleBuildMode = (mode: BuildMode) => {
            setBuildMode(buildMode === mode ? null : mode);
        };

        // End Turn Logic
        const handleEndTurn = () => {
            if (!isMoveAllowed('endTurn')) return;
            setIsEndingTurn(true);
            setBuildMode(null);
            if (!safeMove(() => moves.endTurn())) {
                setIsEndingTurn(false);
            }
        };

        const endTurnLabel = isEndingTurn ? "Ending..." : "End";
        const endTurnLabelDesktop = isEndingTurn ? "Ending Turn..." : "End Turn";
        const endTurnIcon = isEndingTurn ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />;

        // Roll Logic
        const rollLabel = isRolling ? "Rolling..." : "Roll";
        const rollIcon = isRolling ? <Loader2 size={24} className="animate-spin" /> : <Dice size={24} />;

        const handleRoll = () => {
            if (!isMoveAllowed('rollDice')) return;
            setIsRolling(true);
            if (!safeMove(() => moves.rollDice())) {
                setIsRolling(false);
            }
        };

        const lastRollSum = G.lastRoll[0] + G.lastRoll[1];
        const showLastRoll = !isMoveAllowed('rollDice') && lastRollSum > 0;
        const showRollButton = isMoveAllowed('rollDice') || isRollingStage; // Keep visible during transition/check

        return (
             <div className={`flex-grow flex items-center justify-between gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 shadow-lg ${className}`}>

                 {/* 1. Build Buttons */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                    {BUILD_BUTTON_CONFIG.map(({ type, Icon, ariaPrefix }) => {
                        const affordable = affordMap[type];
                        const moveAllowed = isMoveAllowed(moveNameMap[type]);

                        // Enable button if it is affordable OR if it is currently selected (to allow deselection)
                        // But strictly only if the move is allowed in the current stage.
                        const isEnabled = moveAllowed && (affordable || buildMode === type);

                        return (
                            <div key={type} className="inline-block" data-tooltip-id="cost-tooltip" data-tooltip-content={JSON.stringify(BUILD_COSTS[type])}>
                                <button
                                    onClick={() => toggleBuildMode(type)}
                                    disabled={!isEnabled}
                                    aria-label={`${ariaPrefix} (${costString(type)})`}
                                    aria-pressed={buildMode === type}
                                    className={`p-3 rounded-lg transition-all flex items-center justify-center ${getButtonClass(type)}`}
                                >
                                    <Icon size={20} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* 2. End Turn */}
                <button
                    onClick={handleEndTurn}
                    disabled={!isMoveAllowed('endTurn') || isEndingTurn}
                    aria-label={endTurnLabelDesktop}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-lg shadow transition-all active:scale-95 disabled:active:scale-100 font-bold text-sm ml-2 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                >
                    <span className="md:hidden">{endTurnLabel}</span>
                    <span className="hidden md:inline">{endTurnLabelDesktop}</span>
                    {endTurnIcon}
                </button>

                {/* 3. Right Section: Roll Button OR Last Roll */}
                {showRollButton && (
                    <button
                        onClick={handleRoll}
                        disabled={G.hasRolled || isRolling}
                        aria-label={rollLabel}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-lg shadow-lg border border-blue-400/50 transition-all active:scale-95 disabled:active:scale-100 font-bold text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                    >
                        {rollIcon}
                        <span className="text-base font-bold">{rollLabel}</span>
                    </button>
                )}

                {showLastRoll && (
                     <div className="flex items-center gap-2 ml-1 px-2 py-1 border-l border-slate-700/50">
                         <Dice className="text-blue-400" size={20} />
                         <span className="text-xl font-bold text-white">{lastRollSum}</span>
                     </div>
                )}
            </div>
        );
    }

    return null;
};
