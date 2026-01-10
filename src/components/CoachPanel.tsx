import React from 'react';
import { GameState } from '../game/types';
import { calculatePlayerPotentialPips } from '../game/analyst';
import { ResourceIconRow } from './ResourceIconRow';

interface CoachPanelProps {
    G?: GameState;
    showCoachMode: boolean;
    setShowCoachMode: (show: boolean) => void;
}

export const CoachPanel: React.FC<CoachPanelProps> = ({ G, showCoachMode, setShowCoachMode }) => {
    const playerPotentials = G ? calculatePlayerPotentialPips(G) : null;

    return (
        <div className="text-slate-100 h-full flex flex-col gap-6">

            {/* 1. Coach Mode Toggle (Top) */}
            <div className="flex flex-col gap-2">
                <label className="flex items-center justify-between bg-slate-800 p-3 rounded border border-slate-700 cursor-pointer hover:bg-slate-750 hover:border-slate-600 transition-colors group">
                    <span className="font-semibold text-sm group-hover:text-amber-400 transition-colors">Coach Mode</span>
                    <div className="relative inline-flex items-center">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={showCoachMode}
                            onChange={(e) => setShowCoachMode(e.target.checked)}
                            aria-label="Toggle Coach Mode"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                </label>
            </div>

            {/* 2. Player Production Potential (Middle) */}
            {playerPotentials && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">Player Production Potential</h3>
                    <div className="flex flex-col gap-2">
                        {Object.values(G.players).map(player => (
                            <div key={player.id} className="bg-slate-800 p-2 rounded border border-slate-700">
                                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: player.color }}></div>
                                    Player {Number(player.id) + 1}
                                </div>
                                <ResourceIconRow resources={playerPotentials[player.id]} size="sm" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Strategic Advice (Bottom) */}
            <div>
                <h3 className="text-lg font-semibold mb-4 text-amber-400">Strategic Advice</h3>
                <p className="text-slate-300 mb-4">
                    The Coach Bot is analyzing the board...
                </p>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                    <p className="text-sm italic text-slate-400">
                        "Focus on securing ore resources early to build cities faster."
                    </p>
                </div>
            </div>
        </div>
    );
};
