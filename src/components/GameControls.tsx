import React, { useState, useEffect } from 'react';
import { GameState } from '../game/types';
import { BUILD_COSTS } from '../game/config';
import { Dices as Dice, ArrowRight, Loader2, Handshake } from 'lucide-react';
import { Ctx } from 'boardgame.io';
import { BUILD_BUTTON_CONFIG } from './uiConfig';
import { PHASES, STAGES, STAGE_MOVES } from '../game/constants';
import { safeMove } from '../utils/moveUtils';
import { getAffordableBuilds } from '../game/mechanics/costs';
import { calculateTrade } from '../game/moves/trade';
import { capitalize } from '../utils/stringUtils';

export type BuildMode = 'road' | 'settlement' | 'city' | null;
export type UiMode = 'viewing' | 'placing';

export interface GameControlsProps {
    G: GameState;
    ctx: Ctx;
    moves: {
        rollDice: () => void;
        endTurn: () => void;
        tradeBank: () => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: (...args: any[]) => void;
    };
    buildMode: BuildMode;
    setBuildMode: (mode: BuildMode) => void;
    uiMode: UiMode;
    setUiMode: (mode: UiMode) => void;
    className?: string;
    // New props for lifted state
    isRolling?: boolean;
    setIsRolling?: (isRolling: boolean) => void;
}

const BeginPlacementButton: React.FC<{ onClick: () => void, className?: string }> = ({ onClick, className }) => (
    <button
        onClick={onClick}
        className={className}
    >
        <span className={className?.includes('text-lg') ? "text-lg font-bold" : "text-base font-bold"}>Begin Placement</span>
    </button>
);

export const GameControls: React.FC<GameControlsProps> = ({
    G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, className = '',
    isRolling: propIsRolling, setIsRolling: propSetIsRolling
}) => {
    const isSetup = ctx.phase === PHASES.SETUP;
    const isGameplay = ctx.phase === PHASES.GAMEPLAY;

    const activeStage = ctx.activePlayers?.[ctx.currentPlayer];
    const isRollingStage = isGameplay && activeStage === STAGES.ROLLING;

    // Use local state if props are not provided (backward compatibility / isolation)
    const [localIsRolling, setLocalIsRolling] = useState(false);
    const [isEndingTurn, setIsEndingTurn] = useState(false);

    const isRolling = propIsRolling !== undefined ? propIsRolling : localIsRolling;
    const setRolling = propSetIsRolling || setLocalIsRolling;

    useEffect(() => {
        setRolling(false);
        setIsEndingTurn(false);
    }, [ctx.currentPlayer, ctx.phase, activeStage, setRolling]);

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
        className="w-full h-full flex items-center justify-center text-white px-4 py-3 bg-blue-600 hover:bg-blue-500 backdrop-blur-md border border-blue-400/50 rounded-xl shadow-lg transition-all active:scale-95 btn-focus-ring animate-pulse motion-reduce:animate-none"
                    />
                </div>
             );
        }

        return (
             <div className={`flex-grow flex pointer-events-auto ${className}`}>
                 <button
                    onClick={() => setUiMode('viewing')}
                    className="w-full h-full flex items-center justify-center text-white px-4 py-3 bg-red-600 hover:bg-red-500 backdrop-blur-md border border-red-500/50 rounded-xl shadow-lg transition-all active:scale-95 btn-focus-ring"
                 >
                     <span className="text-base font-bold">Cancel Placement</span>
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
        const affordMap = getAffordableBuilds(resources);

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
            const base = "btn-focus-ring";
            if (buildMode === mode) return `${base} bg-amber-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.5)]`;
            return `${base} bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed`;
        };

        const toggleBuildMode = (mode: BuildMode) => {
            setBuildMode(buildMode === mode ? null : mode);
        };

        // Trade Logic
        const tradeResult = calculateTrade(resources);
        const canTrade = tradeResult.canTrade && isMoveAllowed('tradeBank');
        const tradeTooltip = canTrade
            ? `Trade 4 ${capitalize(tradeResult.give)} for 1 ${capitalize(tradeResult.receive)}`
            : "Need 4 of a resource to trade";

        const handleTrade = () => {
            if (canTrade) {
                safeMove(() => moves.tradeBank());
            }
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
        const endTurnIcon = isEndingTurn ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <ArrowRight size={16} />;

        // Roll Logic
        const rollLabel = isRolling ? "Rolling..." : "Roll";
        const rollIcon = isRolling ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <Dice size={16} />;

        const handleRoll = () => {
            if (!isMoveAllowed('rollDice')) return;

            // Start local or lifted rolling state
            setRolling(true);

            // Delay the actual move execution by 1 second to show animation
            setTimeout(() => {
                if (!safeMove(() => moves.rollDice())) {
                    setRolling(false);
                } else {
                    setRolling(false);
                }
            }, 1000);
        };

        const lastRollSum = G.lastRoll[0] + G.lastRoll[1];
        const showLastRoll = !isMoveAllowed('rollDice') && lastRollSum > 0;
        const showRollButton = isMoveAllowed('rollDice') || isRollingStage; // Keep visible during transition/check

        return (
             <div className={`flex-grow flex items-center justify-between gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 shadow-lg ${className}`}>

                 {/* 1. Build Buttons */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                    {/* Trade Button */}
                    <div
                        className="inline-block flex-shrink-0 border-r border-slate-700/50 pr-1"
                        data-tooltip-id="resource-tooltip"
                        data-tooltip-content={tradeTooltip}
                    >
                        <button
                            onClick={handleTrade}
                            disabled={!canTrade}
                            aria-label="Trade 4:1"
                            className={`p-3 rounded-lg flex items-center justify-center transition-all ${
                                canTrade
                                ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white btn-focus-ring"
                                : "bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed"
                            }`}
                        >
                            <Handshake size={20} />
                        </button>
                    </div>

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
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-lg shadow transition-all active:scale-95 disabled:active:scale-100 font-bold text-sm ml-2 whitespace-nowrap btn-focus-ring"
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
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-lg shadow-lg border border-blue-400/50 transition-all active:scale-95 disabled:active:scale-100 font-bold text-sm whitespace-nowrap btn-focus-ring"
                    >
                        {rollIcon}
                        <span>{rollLabel}</span>
                    </button>
                )}

                {showLastRoll && (
                     <div
                        className="flex items-center gap-2 ml-1 px-2 py-1 border-l border-slate-700/50 cursor-help"
                        data-tooltip-id="dice-tooltip"
                        data-tooltip-content={JSON.stringify({ d1: G.lastRoll[0], d2: G.lastRoll[1] })}
                     >
                         <Dice className="text-blue-400" size={20} />
                         <span className="text-xl font-bold text-white">{lastRollSum}</span>
                     </div>
                )}
            </div>
        );
    }

    return null;
};
