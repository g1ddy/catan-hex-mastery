import React from 'react';
import { GameState } from '../game/types';
import { Dices as Dice, ArrowRight, Home, MapPin, Castle, Scroll } from 'lucide-react';
import { Ctx } from 'boardgame.io';

export type BuildMode = 'road' | 'settlement' | 'city' | null;

interface GameControlsProps {
    G: GameState;
    ctx: Ctx;
    moves: Record<string, any>;
    buildMode: BuildMode;
    setBuildMode: (mode: BuildMode) => void;
}

export const GameControls: React.FC<GameControlsProps> = ({ G, ctx, moves, buildMode, setBuildMode }) => {
    const isSetup = ctx.phase === 'setup';
    const isGameplay = ctx.phase === 'GAMEPLAY';
    const stage = ctx.activePlayers?.[ctx.currentPlayer];

    if (isSetup) {
        let instruction = "Wait for your turn...";
        if (stage === 'placeSettlement') instruction = "Place a Settlement";
        if (stage === 'placeRoad') instruction = "Place a Road";

        // Removed potential blocking check: if (ctx.currentPlayer !== player.id) return null;

        return (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg border border-slate-700 pointer-events-none z-[100]">
                <span className="text-lg font-semibold animate-pulse">{instruction}</span>
            </div>
        );
    }

    if (isGameplay) {
        // Roll Phase
        if (!G.hasRolled && stage === 'roll') {
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
            const isActive = (mode: BuildMode) => buildMode === mode ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700";

            return (
                <div className="absolute bottom-6 right-6 flex flex-col items-end space-y-4 pointer-events-auto max-w-[90vw] z-[100]">
                     {/* Build Menu */}
                    <div className="bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 shadow-2xl flex flex-wrap gap-2 justify-end">
                        <button
                            onClick={() => setBuildMode(buildMode === 'road' ? null : 'road')}
                            className={`p-3 rounded-lg transition-all flex items-center gap-2 ${isActive('road')}`}
                            title="Build Road (1 Wood, 1 Brick)"
                        >
                            <MapPin size={20} />
                            <span className="hidden md:inline">Road</span>
                        </button>
                         <button
                            onClick={() => setBuildMode(buildMode === 'settlement' ? null : 'settlement')}
                            className={`p-3 rounded-lg transition-all flex items-center gap-2 ${isActive('settlement')}`}
                            title="Build Settlement (1 Wood, 1 Brick, 1 Wheat, 1 Sheep)"
                        >
                            <Home size={20} />
                            <span className="hidden md:inline">Settlement</span>
                        </button>
                         <button
                            onClick={() => setBuildMode(buildMode === 'city' ? null : 'city')}
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
                        onClick={() => {
                            setBuildMode(null);
                            moves.endTurn();
                        }}
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
