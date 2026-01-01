import React, { useState, useEffect } from 'react';
import { GameState, Resources } from '../game/types';
import { BUILD_COSTS } from '../game/config';
import { Dices as Dice, ArrowRight, Loader2 } from 'lucide-react';
import { Ctx } from 'boardgame.io';
import { BUILD_BUTTON_CONFIG } from './uiConfig';
import { PHASES, STAGES } from '../game/constants';
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

const InstructionDisplay: React.FC<{ text: string, className?: string }> = ({ text, className }) => (
    <div className={className} role="status" aria-live="polite">
        <span className={className?.includes('text-lg') ? "text-lg font-semibold text-amber-400" : "text-sm font-semibold text-amber-400"}>
            {text}
        </span>
    </div>
);

export const GameControls: React.FC<GameControlsProps> = ({ G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, className = '' }) => {
    const isSetup = ctx.phase === PHASES.SETUP;
    const isGameplay = ctx.phase === PHASES.GAMEPLAY;

    const activeStage = ctx.activePlayers?.[ctx.currentPlayer];
    const isRollingStage = isGameplay && activeStage === STAGES.ROLLING;
    const isActingStage = isGameplay && activeStage === STAGES.ACTING;

    const [isRolling, setIsRolling] = useState(false);
    const [isEndingTurn, setIsEndingTurn] = useState(false);

    useEffect(() => {
        setIsRolling(false);
        setIsEndingTurn(false);
    }, [ctx.currentPlayer, ctx.phase, activeStage]);

    // Setup Phase
    if (isSetup) {
        let instruction = "Wait for your turn...";
        let canInteract = false;

        if (activeStage === STAGES.PLACE_SETTLEMENT) {
            instruction = "Place a Settlement";
            canInteract = true;
        }
        if (activeStage === STAGES.PLACE_ROAD) {
            instruction = "Place a Road";
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
                        className="flex-grow flex items-center justify-center text-white px-4 py-3 bg-blue-600 hover:bg-blue-500 backdrop-blur-md border border-blue-400/50 rounded-xl shadow-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none animate-pulse"
                    />
                </div>
             );
        }

        return (
             <div className={`flex-grow flex pointer-events-auto ${className}`}>
                <InstructionDisplay
                    text={instruction}
                    className="flex-grow flex items-center justify-center text-white px-4 py-3 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-lg"
                />
             </div>
        );
    }

    if (isGameplay) {
        // Roll Stage
        if (isRollingStage) {
            const rollLabel = isRolling ? "Rolling..." : "Roll Dice";
            const rollIcon = isRolling ? <Loader2 size={24} className="animate-spin" /> : <Dice size={24} />;

            return (
                <div className={`flex-grow flex justify-end items-center pointer-events-auto ${className}`}>
                    <button
                        onClick={() => {
                            setIsRolling(true);
                            if (!safeMove(() => moves.rollDice())) {
                                setIsRolling(false);
                            }
                        }}
                        disabled={G.hasRolled || isRolling}
                        aria-label={rollLabel}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl shadow-lg border border-blue-400/50 transition-all active:scale-95 disabled:active:scale-100 w-full justify-center focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                    >
                        {rollIcon}
                        <span className="text-base md:text-lg font-bold">{rollLabel}</span>
                    </button>
                </div>
            );
        }

        // Acting Stage
        if (isActingStage) {
            const resources = G.players[ctx.currentPlayer].resources;

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

            const costString = (type: keyof typeof BUILD_COSTS) => {
                 const cost = BUILD_COSTS[type];
                 const parts = Object.entries(cost).map(([res, amt]) => `${amt} ${res.charAt(0).toUpperCase() + res.slice(1)}`);
                 return `Cost: ${parts.join(', ')}`;
            };

            const getButtonClass = (mode: BuildMode, canAfford: boolean) => {
                const base = "focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none";
                if (buildMode === mode) return `${base} bg-amber-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.5)]`;
                if (!canAfford) return `${base} bg-slate-800 text-slate-500 cursor-not-allowed opacity-50`;
                return `${base} bg-slate-800 text-slate-300 hover:bg-slate-700`;
            };

            const toggleBuildMode = (mode: BuildMode, canAfford: boolean) => {
                if (!canAfford && buildMode !== mode) return; // Prevent enabling if can't afford
                setBuildMode(buildMode === mode ? null : mode);
            };

            const handleEndTurn = () => {
                setIsEndingTurn(true);
                setBuildMode(null);
                if (!safeMove(() => moves.endTurn())) {
                    setIsEndingTurn(false);
                }
            };

            const lastRollSum = G.lastRoll[0] + G.lastRoll[1];

            // Standardizing End Turn button
            const endTurnLabel = isEndingTurn ? "Ending..." : "End";
            const endTurnLabelDesktop = isEndingTurn ? "Ending Turn..." : "End Turn";
            const endTurnIcon = isEndingTurn ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />;

            return (
                 <div className={`flex-grow flex items-center justify-between gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 shadow-lg ${className}`}>
                     {/* Last Roll Display */}
                     {lastRollSum > 0 && (
                         <div className="flex items-center gap-2 mr-1 px-2 py-1 border-r border-slate-700/50">
                             <Dice className="text-blue-400" size={20} />
                             <span className="text-xl font-bold text-white">{lastRollSum}</span>
                         </div>
                     )}

                     {/* Build Menu Row */}
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                        {BUILD_BUTTON_CONFIG.map(({ type, Icon, ariaPrefix }) => {
                            const affordable = affordMap[type];
                            return (
                                <div key={type} className="inline-block" data-tooltip-id="cost-tooltip" data-tooltip-content={JSON.stringify(BUILD_COSTS[type])}>
                                    <button
                                        onClick={() => toggleBuildMode(type, affordable)}
                                        disabled={!affordable}
                                        aria-label={`${ariaPrefix} (${costString(type)})`}
                                        aria-pressed={buildMode === type}
                                        className={`p-3 rounded-lg transition-all flex items-center justify-center ${getButtonClass(type, affordable)}`}
                                    >
                                        <Icon size={20} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* End Turn */}
                    <button
                        onClick={handleEndTurn}
                        disabled={isEndingTurn}
                        aria-label={endTurnLabelDesktop}
                        className="flex items-center gap-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-lg shadow transition-all active:scale-95 disabled:active:scale-100 font-bold text-sm ml-2 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                    >
                        <span className="md:hidden">{endTurnLabel}</span>
                        <span className="hidden md:inline">{endTurnLabelDesktop}</span>
                        {endTurnIcon}
                    </button>
                </div>
            );
        }
    }

    return null;
};
