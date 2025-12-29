import React from 'react';
import { GameState } from '../game/types';
import { Dices as Dice, ArrowRight, Home, MapPin, Castle, Scroll } from 'lucide-react';
import { Ctx } from 'boardgame.io';

export type BuildMode = 'road' | 'settlement' | 'city' | null;
export type UiMode = 'viewing' | 'placing';

interface GameControlsProps {
    G: GameState;
    ctx: Ctx;
    moves: Record<string, any>;
    buildMode: BuildMode;
    setBuildMode: (mode: BuildMode) => void;
    uiMode: UiMode;
    setUiMode: (mode: UiMode) => void;
    variant?: 'floating' | 'docked';
}

export const GameControls: React.FC<GameControlsProps> = ({ G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, variant = 'floating' }) => {
    const isSetup = ctx.phase === 'setup';
    const isGameplay = ctx.phase === 'GAMEPLAY';
    const stage = ctx.activePlayers?.[ctx.currentPlayer];

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
            if (canInteract) {
                setUiMode(uiMode === 'viewing' ? 'placing' : 'viewing');
            }
        };

        const activeClass = uiMode === 'placing' ? 'ring-2 ring-amber-400 bg-slate-800' : '';
        const pointerClass = canInteract ? 'cursor-pointer hover:bg-slate-800 active:scale-95' : 'pointer-events-none opacity-70';

        if (variant === 'docked') {
             // Mobile Bottom Floating Bar Style
            return (
                 <div onClick={handleClick} className={`flex-grow flex items-center justify-center text-white px-4 py-3 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-lg transition-all ${pointerClass} ${activeClass}`}>
                    <span className={`text-sm font-semibold ${uiMode === 'placing' ? 'text-amber-400' : 'animate-pulse'}`}>
                        {uiMode === 'placing' ? 'Tap a highlighted spot!' : instruction}
                    </span>
                </div>
            );
        }

        return (
            <div onClick={handleClick} className={`absolute top-20 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg border border-slate-700 z-[100] transition-all ${pointerClass} ${activeClass}`}>
                <span className={`text-lg font-semibold ${uiMode === 'placing' ? 'text-amber-400' : 'animate-pulse'}`}>
                    {uiMode === 'placing' ? 'Select a location on the board' : instruction}
                </span>
            </div>
        );
    }

    if (isGameplay) {
        // Roll Phase
        if (!G.hasRolled && stage === 'roll') {
            if (variant === 'docked') {
                return (
                    <div className="flex-grow flex justify-end items-center pointer-events-auto">
                        <button
                            onClick={() => moves.rollDice()}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl shadow-lg border border-blue-400/50 transition-all active:scale-95 w-full justify-center"
                        >
                            <Dice size={24} />
                            <span className="text-base font-bold">Roll Dice</span>
                        </button>
                    </div>
                );
            }

             return (
                <div className="absolute bottom-6 right-6 flex flex-col items-end space-y-4 pointer-events-auto z-[100]">
                    <button
                        onClick={() => moves.rollDice()}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-xl shadow-xl transition-all active:scale-95"
                    >
                        <Dice size={24} />
                        <span className="text-lg font-bold">Roll Dice</span>
                    </button>
                </div>
            );
        }

        // Action Phase
        if (G.hasRolled || stage === 'action') {
            const isActive = (mode: BuildMode) => buildMode === mode ? "bg-amber-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-slate-800 text-slate-300 hover:bg-slate-700";

            const toggleBuildMode = (mode: BuildMode) => {
                setBuildMode(buildMode === mode ? null : mode);
            };

            const handleEndTurn = () => {
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
                            <button
                                onClick={() => toggleBuildMode('road')}
                                className={`p-3 rounded-lg transition-all flex items-center justify-center ${isActive('road')}`}
                                title="Road"
                            >
                                <MapPin size={20} />
                            </button>
                             <button
                                onClick={() => toggleBuildMode('settlement')}
                                className={`p-3 rounded-lg transition-all flex items-center justify-center ${isActive('settlement')}`}
                                title="Settlement"
                            >
                                <Home size={20} />
                            </button>
                             <button
                                onClick={() => toggleBuildMode('city')}
                                className={`p-3 rounded-lg transition-all flex items-center justify-center ${isActive('city')}`}
                                title="City"
                            >
                                <Castle size={20} />
                            </button>
                             {/* Dev Card Button (Placeholder) - maybe hide on mobile to save space if not needed yet? Keeping for consistency but simplified */}
                        </div>

                        {/* End Turn */}
                        <button
                            onClick={handleEndTurn}
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg shadow transition-all active:scale-95 font-bold text-sm ml-2 whitespace-nowrap"
                        >
                            <span>End</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                );
            }

            return (
                <div className="absolute bottom-6 right-6 flex flex-col items-end space-y-4 pointer-events-auto max-w-[90vw] z-[100]">
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
                        <button
                            onClick={() => toggleBuildMode('road')}
                            className={`p-3 rounded-lg transition-all flex items-center gap-2 ${isActive('road')}`}
                            title="Build Road (1 Wood, 1 Brick)"
                        >
                            <MapPin size={20} />
                            <span className="hidden md:inline">Road</span>
                        </button>
                         <button
                            onClick={() => toggleBuildMode('settlement')}
                            className={`p-3 rounded-lg transition-all flex items-center gap-2 ${isActive('settlement')}`}
                            title="Build Settlement (1 Wood, 1 Brick, 1 Wheat, 1 Sheep)"
                        >
                            <Home size={20} />
                            <span className="hidden md:inline">Settlement</span>
                        </button>
                         <button
                            onClick={() => toggleBuildMode('city')}
                            className={`p-3 rounded-lg transition-all flex items-center gap-2 ${isActive('city')}`}
                            title="Build City (3 Ore, 2 Wheat)"
                        >
                            <Castle size={20} />
                            <span className="hidden md:inline">City</span>
                        </button>
                         <button
                            className="p-3 rounded-lg bg-slate-800 text-slate-500 cursor-not-allowed flex items-center gap-2"
                            title="Dev Card (Coming Soon)"
                        >
                            <Scroll size={20} />
                            <span className="hidden md:inline">Dev Card</span>
                        </button>
                    </div>

                    {/* End Turn */}
                    <button
                        onClick={handleEndTurn}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg transition-all active:scale-95 font-bold"
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
