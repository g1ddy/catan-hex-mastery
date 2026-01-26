import React from 'react';
import { GameState } from '../../../game/core/types';
import { calculatePlayerPotentialPips } from '../../../game/analysis/analyst';
import { ResourceIconRow } from '../../shared/components/ResourceIconRow';
import { PlayerPotentialChart } from './PlayerPotentialChart';

interface PlayerProductionPotentialProps {
    G?: GameState;
}

export const PlayerProductionPotential: React.FC<PlayerProductionPotentialProps> = ({ G }) => {
    if (!G) return null;

    const playerPotentials = calculatePlayerPotentialPips(G);

    return (
        <div>
            <h3 className="text-lg font-semibold mb-2 text-slate-100">Player Production Potential</h3>

            {/* Section 1: Per-Player Icon Tracker */}
            <div className="flex flex-col gap-2">
                {Object.values(G.players).map(player => (
                    <div key={player.id} className="bg-slate-800 p-2 rounded border border-slate-700">
                        <div className="flex items-center gap-2 font-bold text-sm mb-1 text-slate-200">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: player.color }}></div>
                            <span className="truncate" title={`P${Number(player.id) + 1}: ${player.name}`}>
                                P{Number(player.id) + 1}: {player.name}
                            </span>
                        </div>
                        {/* eslint-disable-next-line security/detect-object-injection */}
                        <ResourceIconRow resources={playerPotentials[player.id]} size="sm" />
                    </div>
                ))}
            </div>

            {/* Section 2: Resource Distribution Chart */}
            <PlayerPotentialChart playerPotentials={playerPotentials} players={G.players} />
        </div>
    );
};
