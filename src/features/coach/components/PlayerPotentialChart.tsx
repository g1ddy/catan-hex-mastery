import React from 'react';
import { Player } from '../../../game/core/types';
import { RESOURCE_META } from '../../shared/config/uiConfig';

interface PlayerPotentialChartProps {
    playerPotentials: Record<string, Record<string, number>>;
    players: Record<string, Player>;
}

export const PlayerPotentialChart: React.FC<PlayerPotentialChartProps> = ({ playerPotentials, players }) => {
    return (
        <div className="flex flex-col gap-3 mt-4">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Resource Distribution</h4>
            <div className="flex flex-col gap-3">
                {RESOURCE_META.map(({ name, label, Icon, color }) => {
                    const playerPips = Object.values(players).map(player => ({
                        playerId: player.id,
                        pips: playerPotentials[player.id]?.[name] || 0,
                    }));

                    const totalPips = playerPips.reduce((sum, p) => sum + p.pips, 0);

                    const segments = playerPips
                        .filter(({ pips }) => pips > 0)
                        .map(({ playerId, pips }) => ({
                            playerId,
                            pips,
                            percent: totalPips > 0 ? (pips / totalPips) * 100 : 0,
                        }));

                    return (
                        <div key={name} className="flex flex-col gap-1">
                            {/* Header: Icon + Name + Total */}
                            <div className="flex items-center justify-between text-xs text-slate-300">
                                <div className="flex items-center gap-1.5">
                                    <Icon size={14} className={color} />
                                    <span>{label}</span>
                                </div>
                                <span className="text-slate-500">{totalPips} pips</span>
                            </div>

                            {/* Stacked Bar */}
                            <div className="h-2 w-full bg-slate-700 rounded-full flex overflow-hidden">
                                {totalPips > 0 ? (
                                    segments.map((seg) => (
                                        <div
                                            key={seg.playerId}
                                            style={{
                                                width: `${seg.percent}%`,
                                                backgroundColor: players[seg.playerId].color
                                            }}
                                            title={`${players[seg.playerId].name}: ${seg.pips} pips (${Math.round(seg.percent)}%)`}
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
