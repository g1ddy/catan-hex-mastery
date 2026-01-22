import React from 'react';
import { Ctx } from 'boardgame.io';
import { GameState } from '../game/core/types';
import { calculatePlayerPotentialPips } from '../game/analysis/analyst';
import { ResourceIconRow } from './ResourceIconRow';
import { StrategicAdvice } from '../game/analysis/coach';

interface CoachPanelProps {
    G?: GameState;
    ctx: Ctx;
    showResourceHeatmap: boolean;
    setShowResourceHeatmap: (show: boolean) => void;
    isCoachModeEnabled: boolean;
    setIsCoachModeEnabled: (enabled: boolean) => void;
    advice?: StrategicAdvice | null;
}

export const CoachPanel: React.FC<CoachPanelProps> = ({
    G,
    showResourceHeatmap,
    setShowResourceHeatmap,
    isCoachModeEnabled,
    setIsCoachModeEnabled,
    advice
}) => {
    const playerPotentials = G ? calculatePlayerPotentialPips(G) : null;

    return (
        <div className="text-slate-100 h-full flex flex-col gap-6">

            <div className="flex flex-col gap-2">
                {/* 0. Master Coach Toggle */}
                <label className="flex items-center justify-between bg-slate-800 p-3 rounded border border-slate-700 cursor-pointer hover:bg-slate-750 hover:border-slate-600 transition-colors group">
                    <span className="font-semibold text-sm text-amber-400 group-hover:text-amber-300 transition-colors">Coach Mode</span>
                    <div className="relative inline-flex items-center">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isCoachModeEnabled}
                            onChange={(e) => setIsCoachModeEnabled(e.target.checked)}
                            aria-label="Toggle Coach Mode"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </div>
                </label>

                {/* 1. Resource Heatmap Toggle */}
                <label className={`flex items-center justify-between bg-slate-800 p-3 rounded border border-slate-700 transition-colors group ${!isCoachModeEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-750 hover:border-slate-600'}`}>
                    <span className="font-semibold text-sm group-hover:text-blue-400 transition-colors">Resource Heatmap</span>
                    <div className="relative inline-flex items-center">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={showResourceHeatmap}
                            onChange={(e) => isCoachModeEnabled && setShowResourceHeatmap(e.target.checked)}
                            disabled={!isCoachModeEnabled}
                            aria-label="Toggle Resource Heatmap"
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
                        {Object.values(G!.players).map(player => (
                            <div key={player.id} className="bg-slate-800 p-2 rounded border border-slate-700">
                                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: player.color }}></div>
                                    <span className="truncate" title={`P${Number(player.id) + 1}: ${player.name}`}>P{Number(player.id) + 1}: {player.name}</span>
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
                <div className="bg-slate-800 p-4 rounded border border-slate-700 shadow-sm">
                    {isCoachModeEnabled ? (
                        <p className="text-sm italic text-slate-300">
                            "{advice ? advice.text : "Waiting for game state..."}"
                        </p>
                    ) : (
                        <p className="text-sm italic text-slate-500">
                            Coach mode disabled
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
