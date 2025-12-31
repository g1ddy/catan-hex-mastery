import React, { useState, useEffect } from 'react';
import { Z_INDEX_FLOATING_UI } from '../styles/z-indices';
import { GameState, Resources } from '../game/types';
import { BUILD_COSTS } from '../game/config';
import { Dices as Dice, ArrowRight, Scroll } from 'lucide-react';
import { Ctx } from 'boardgame.io';
import { BUILD_BUTTON_CONFIG } from './uiConfig';
import { PHASES } from '../game/constants';

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
    variant?: 'floating' | 'docked';
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
    <div className={className}>
        <span className={className?.includes('text-lg') ? "text-lg font-semibold text-amber-400" : "text-sm font-semibold text-amber-400"}>
            {text}
        </span>
    </div>
);

export const GameControls: React.FC<GameControlsProps> = ({ G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, variant = 'floating' }) => {
    const isSetup = ctx.phase === PHASES.SETUP;
    // Gameplay phases include ROLLING and ACTION
    const isGameplay = ctx.phase === PHASES.ROLLING || ctx.phase === PHASES.ACTION;
    const isRollingPhase = ctx.phase === PHASES.ROLLING;
    const isActionPhase = ctx.phase === PHASES.ACTION;
    const stage = ctx.activePlayers?.[ctx.currentPlayer];

    const [isRolling, setIsRolling] = useState(false);
    const [isEndingTurn, setIsEndingTurn] = useState(false);

    useEffect(() => {
        setIsRolling(false);
        setIsEndingTurn(false);
    }, [ctx.currentPlayer, ctx.phase]);

    if (isSetup) {
        let instruction = "Wait for your turn...";
        let canInteract = false;

        if (stage === 'placeSettlement') {
            instruction = "Place a Settlement";
            canInteract = true;
        }
        if (stage === 'placeRoad') {
            instruction = "Place a Road";
            canInteract = true;
        }

        const handleClick = () => {
            if (canInteract && uiMode === 'viewing') {
                setUiMode('placing');
            }
        };

        if (variant === 'docked') {
             // Mobile Bottom Floating Bar Style
             if (uiMode === 'viewing') {
                 return (
                    <BeginPlacementButton
                        onClick={handleClick}
                        className="flex-grow flex items-center justify-center text-white px-4 py-3 bg-blue-600 hover:bg-blue-500 backdrop-blur-md border border-blue-400/50 rounded-xl shadow-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none animate-pulse"
                    />
                 );
             }

            return (
                 <InstructionDisplay
                    text={instruction}
                    className="flex-grow flex items-center justify-center text-white px-4 py-3 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-lg"
                 />
            );
        }

        // Desktop Floating Variant (kept for completeness if reused)
        if (uiMode === 'viewing') {
             return (
                <BeginPlacementButton
                    onClick={handleClick}
                    className={`absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full shadow-lg border border-blue-400/50 z-[${Z_INDEX_FLOATING_UI}] transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none animate-pulse`}
                />
            );
        }

        return (
            <InstructionDisplay
                text={instruction}
                className={`absolute top-20 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg border border-slate-700 z-[${Z_INDEX_FLOATING_UI}]`}
            />
        );
    }

    if (isGameplay) {
        // Roll Phase: Active if phase is ROLLING (or implicit logic with !hasRolled)
        // Original logic checked for stage === 'roll', but phase-based is cleaner now.
        // We stick to the phase check mainly.
        if (isRollingPhase && !G.hasRolled) {
            if (variant === 'docked') {
                return (
                    <div className="flex-grow flex justify-end items-center pointer-events-auto">
                        <button
                            onClick={() => { setIsRolling(true); moves.rollDice(); }}
                            disabled={G.hasRolled || isRolling}
                            aria-label="Roll Dice"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl shadow-lg border border-blue-400/50 transition-all active:scale-95 disabled:active:scale-100 w-full justify-center focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                        >
                            <Dice size={24} />
                            <span className="text-base font-bold">Roll Dice</span>
                        </button>
                    </div>
                );
            }

             return (
                <div className={`absolute bottom-6 right-6 flex flex-col items-end space-y-4 pointer-events-auto z-[${Z_INDEX_FLOATING_UI}]`}>
                    <button
                        onClick={() => { setIsRolling(true); moves.rollDice(); }}
                        disabled={G.hasRolled || isRolling}
                        aria-label="Roll Dice"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-4 rounded-xl shadow-xl transition-all active:scale-95 disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                    >
                        <Dice size={24} />
                        <span className="text-lg font-bold">Roll Dice</span>
                    </button>
                </div>
            );
        }

        // Action Phase
        // We show action controls if it is the action phase OR if we have rolled (backward compatibility or just safety)
        if (isActionPhase || G.hasRolled) {
            const resources = G.players[ctx.currentPlayer].resources;

            const canAfford = (cost: Partial<Resources>): boolean => {
                return (Object.keys(cost) as Array<keyof Resources>).every(
                    resource => resources[resource] >= (cost[resource] || 0)
                );
            };

            const canAffordRoad = canAfford(BUILD_COSTS.road);
            const canAffordSettlement = canAfford(BUILD_COSTS.settlement);
            const canAffordCity = canAfford(BUILD_COSTS.city);

            // Map afford status to key
            const affordMap = {
                road: canAffordRoad,
                settlement: canAffordSettlement,
                city: canAffordCity
            };

            const costString = (type: keyof typeof BUILD_COSTS) => {
                 const cost = BUILD_COSTS[type];
                 const parts = Object.entries(cost).map(([res, amt]) => `${amt} ${res.charAt(0).toUpperCase() + res.slice(1)}`);
                 return `Cost: ${parts.join(', ')}`;
            };

            // Helper to generate class string based on affordability and active state
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
                moves.endTurn();
            };

            const lastRollSum = G.lastRoll[0] + G.lastRoll[1];

            if (variant === 'docked') {
                return (
                     <div className="flex-grow flex items-center justify-between gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 shadow-lg">
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
                                            className={`p-3 rounded-lg transition-all flex items-center justify-center ${getButtonClass(type, affordable)}`}
                                        >
                                            <Icon size={20} />
                                        </button>
                                    </div>
                                );
                            })}
                             {/* Dev Card Button (Placeholder) - maybe hide on mobile to save space if not needed yet? Keeping for consistency but simplified */}
                        </div>

                        {/* End Turn */}
                        <button
                            onClick={handleEndTurn}
                            disabled={isEndingTurn}
                            aria-label="End Turn"
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-lg shadow transition-all active:scale-95 disabled:active:scale-100 font-bold text-sm ml-2 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                        >
                            <span>End</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                );
            }

            return (
                <div className={`absolute bottom-6 right-6 flex flex-col items-end space-y-4 pointer-events-auto max-w-[90vw] z-[${Z_INDEX_FLOATING_UI}]`}>
                     {/* Build Menu */}
                    <div className="bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 shadow-2xl flex flex-wrap gap-2 justify-end">
                         {/* Last Roll Display */}
                         {lastRollSum > 0 && (
                             <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 text-white mr-2">
                                 <Dice className="text-blue-400" size={20} />
                                 <span className="font-bold">{lastRollSum}</span>
                                 <span className="text-xs text-slate-500">({G.lastRoll[0]}+{G.lastRoll[1]})</span>
                             </div>
                         )}
                        {BUILD_BUTTON_CONFIG.map(({ type, label, Icon, ariaPrefix }) => {
                            const affordable = affordMap[type];
                            return (
                                <div key={type} className="inline-block" data-tooltip-id="cost-tooltip" data-tooltip-content={JSON.stringify(BUILD_COSTS[type])}>
                                    <button
                                        onClick={() => toggleBuildMode(type, affordable)}
                                        disabled={!affordable}
                                        aria-label={`${ariaPrefix} (${costString(type)})`}
                                        className={`p-3 rounded-lg transition-all flex items-center gap-2 ${getButtonClass(type, affordable)}`}
                                    >
                                        <Icon size={20} />
                                        <span className="hidden md:inline">{label}</span>
                                    </button>
                                </div>
                            );
                        })}
                         <button
                            className="p-3 rounded-lg bg-slate-800 text-slate-500 cursor-not-allowed flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                            title="Dev Card (Coming Soon)"
                            aria-label="Dev Card (Coming Soon)"
                            disabled
                        >
                            <Scroll size={20} />
                            <span className="hidden md:inline">Dev Card</span>
                        </button>
                    </div>

                    {/* End Turn */}
                    <button
                        onClick={handleEndTurn}
                        disabled={isEndingTurn}
                        aria-label="End Turn"
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:active:scale-100 font-bold focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                    >
                        <span>End Turn</span>
                        <ArrowRight size={20} />
                    </button>
                </div>
            );
        }
    }

    return null;
};
