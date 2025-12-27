import React from 'react';
import { GameState, Player } from '../game/types';
import { Trees, BrickWall, Wheat, Mountain, Cloud } from 'lucide-react';

interface PlayerPanelProps {
  players: GameState['players'];
  currentPlayerId: string;
  variant?: 'floating' | 'docked';
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({ players, currentPlayerId, variant = 'floating' }) => {
  const playerList = Object.values(players);

  if (variant === 'docked') {
    return (
      <div className="player-panel-docked w-full bg-slate-900/50 backdrop-blur-sm border-b border-slate-700 p-2 text-slate-100 flex gap-4 overflow-x-auto whitespace-nowrap">
        {playerList.map((player: Player) => (
          <div key={player.id}
               className={`p-1 px-2 rounded border transition-colors flex items-center gap-3 ${player.id === currentPlayerId ? 'border-slate-400 bg-slate-800' : 'border-slate-700 bg-transparent'}`}
          >
            <div className="flex items-center gap-1 font-bold text-sm">
              <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: player.color }}></div>
              P{Number(player.id) + 1}
            </div>
            <div className="text-xs text-slate-300">
               VP:{player.victoryPoints}
            </div>
            {/* Minimal Resources View */}
             <div className="flex gap-1 text-xs items-center opacity-75">
                <span className="flex items-center gap-0.5" title="Cards"><Trees size={12}/>{Object.values(player.resources).reduce((a, b) => a + b, 0)}</span>
            </div>
          </div>
        ))}
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
              <div title="Wood" className="flex items-center gap-1">
                <Trees size={16} className="text-green-500" />
                <span>{player.resources.wood}</span>
              </div>
              <div title="Brick" className="flex items-center gap-1">
                <BrickWall size={16} className="text-orange-700" />
                <span>{player.resources.brick}</span>
              </div>
              <div title="Sheep" className="flex items-center gap-1">
                <Cloud size={16} className="text-slate-300" />
                <span>{player.resources.sheep}</span>
              </div>
              <div title="Wheat" className="flex items-center gap-1">
                <Wheat size={16} className="text-yellow-500" />
                <span>{player.resources.wheat}</span>
              </div>
              <div title="Ore" className="flex items-center gap-1">
                <Mountain size={16} className="text-gray-400" />
                <span>{player.resources.ore}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
