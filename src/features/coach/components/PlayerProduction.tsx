import React from 'react';
import { Player } from '../../../game/core/types';
import { RESOURCE_META } from '../../shared/config/uiConfig';

interface PlayerProductionProps {
    playerPotentials: Record<string, Record<string, number>>;
    players: Record<string, Player>;
}

export const PlayerProduction: React.FC<PlayerProductionProps> = ({ playerPotentials, players }) => {
    return (
        <div className="flex flex-col gap-3 mt-4">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Player Production</h4>
            <div className="flex flex-col gap-3">
                {Object.values(players).map((player) => {
                    const resourcePips = RESOURCE_META.map(({ name, color }) => ({
                        name,
                        color: color.replace('text-', 'bg-'),
                        pips: playerPotentials[player.id]?.[name] || 0,
                    }));

                    const totalPips = resourcePips.reduce((sum, r) => sum + r.pips, 0);

                    const segments = resourcePips
                        .filter(({ pips }) => pips > 0)
                        .map(({ name, color, pips }) => ({
                            name,
                            color,
                            pips,
                            percent: totalPips > 0 ? (pips / totalPips) * 100 : 0,
                        }));

                    return (
                        <div key={player.id} className="flex flex-col gap-1">
                            {/* Header: Player Name + Total */}
                            <div className="flex items-center justify-between text-xs text-slate-300">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: player.color }}></div>
                                    <span>{player.name}</span>
                                </div>
                                <span className="text-slate-500">{totalPips} pips</span>
                            </div>

                            {/* Stacked Bar */}
                            <div className="h-2 w-full bg-slate-700 rounded-full flex overflow-hidden">
                                {totalPips > 0 ? (
                                    segments.map((seg) => (
                                        <div
                                            key={seg.name}
                                            className={seg.color}
                                            style={{
                                                width: `${seg.percent}%`,
                                            }}
                                            title={`${seg.name}: ${seg.pips} pips (${Math.round(seg.percent)}%)`}
                                        />
                                    ))
                                ) : (
                                    <div className="w-full h-full bg-slate-800" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
