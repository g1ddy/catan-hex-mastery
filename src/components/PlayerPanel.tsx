import React, { useState } from 'react';
import { GameState, Player } from '../game/types';
import { Trees } from 'lucide-react';
import { ResourceIconRow } from './ResourceIconRow';

interface PlayerPanelProps {
  players: GameState['players'];
  currentPlayerId: string;
  variant?: 'floating' | 'docked';
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({ players, currentPlayerId, variant = 'floating' }) => {
  const playerList = Object.values(players);
  const [isExpanded, setIsExpanded] = useState(false);

  if (variant === 'docked') {
    // New Overlay Mobile Style
    // Top-center floating panel. Glassmorphism.
    return (
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl text-slate-100 shadow-xl overflow-hidden transition-all">
        {/* Header / Summary Row */}
        <div className="flex items-center justify-between p-2 px-3" onClick={() => setIsExpanded(!isExpanded)}>
             <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide w-full justify-center">
                {playerList.map((player: Player) => {
                    const isActive = player.id === currentPlayerId;

                    if (isActive) {
                        // Active Player: Show Compact Resources Row
                        return (
                            <div key={player.id} className="flex items-center gap-2 p-1 px-2 rounded bg-slate-800 border border-slate-600">
                                <div className="flex items-center gap-1 font-bold text-sm text-amber-400">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: player.color }}></div>
                                    P{Number(player.id) + 1}
                                </div>
                                <div className="h-4 w-px bg-slate-600 mx-1"></div>
                                <ResourceIconRow resources={player.resources} size="sm" />
                            </div>
                        );
                    } else {
                        // Opponent: Summary Only
                         return (
                            <div key={player.id} className="flex items-center gap-2 p-1 px-2 rounded bg-transparent border border-transparent opacity-75">
                                <div className="flex items-center gap-1 font-bold text-xs text-slate-300">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: player.color }}></div>
                                    P{Number(player.id) + 1}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                    VP:{player.victoryPoints} | <Trees size={10} className="inline"/> {Object.values(player.resources).reduce((a, b) => a + b, 0)}
                                </div>
                            </div>
                        );
                    }
                })}
            </div>
        </div>
      </div>
    );
  }

  // Floating (Desktop)
  return (
    <div className="player-panel absolute top-20 left-4 w-64 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl text-slate-100 z-[100]">
      <h3 className="font-bold text-lg mb-2">Players</h3>
      <div className="flex flex-col gap-3">
        {playerList.map((player: Player) => (
          <div key={player.id}
               className={`p-2 rounded border transition-colors ${player.id === currentPlayerId ? 'border-slate-400 bg-slate-800' : 'border-slate-700 bg-transparent'}`}
          >
            <div className="flex items-center gap-2 font-bold text-base">
              <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: player.color }}></div>
              Player {Number(player.id) + 1}
            </div>
            <div className="text-sm text-slate-300 mt-1">
              VP: {player.victoryPoints} | Sett: {player.settlements.length} | Roads: {player.roads.length}
            </div>
            <div className="flex gap-3 text-sm mt-2 items-center">
              <ResourceIconRow resources={player.resources} size="md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
