import React from 'react';
import { GameState, Player } from '../game/types';
import { Trees, BrickWall, Wheat, Mountain, Cloud } from 'lucide-react';

interface PlayerPanelProps {
  players: GameState['players'];
  currentPlayerId: string;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({ players, currentPlayerId }) => {
  const playerList = Object.values(players);

  return (
    <div className="player-panel absolute top-2 left-2 bg-white/90 p-2 rounded-lg shadow-md z-[100]">
      <h3>Players</h3>
      <div className="flex flex-col gap-2">
        {playerList.map((player: Player) => (
          <div key={player.id}
               className={`p-1 rounded border ${player.id === currentPlayerId ? 'border-2 border-black bg-gray-100' : 'border-gray-300 bg-transparent'}`}
          >
            <div className="flex items-center gap-1 font-bold">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: player.color }}></div>
              Player {Number(player.id) + 1}
            </div>
            <div className="text-sm mt-1">
              VP: {player.victoryPoints} | Sett: {player.settlements.length} | Roads: {player.roads.length}
            </div>
            <div className="flex gap-2 text-xs mt-1 text-gray-600 items-center">
              <div title="Wood" className="flex items-center gap-0.5">
                <Trees size={14} className="stroke-green-700" />
                <span>{player.resources.wood}</span>
              </div>
              <div title="Brick" className="flex items-center gap-0.5">
                <BrickWall size={14} className="stroke-red-700" />
                <span>{player.resources.brick}</span>
              </div>
              <div title="Sheep" className="flex items-center gap-0.5">
                <Cloud size={14} className="stroke-green-400" />
                <span>{player.resources.sheep}</span>
              </div>
              <div title="Wheat" className="flex items-center gap-0.5">
                <Wheat size={14} className="stroke-yellow-600" />
                <span>{player.resources.wheat}</span>
              </div>
              <div title="Ore" className="flex items-center gap-0.5">
                <Mountain size={14} className="stroke-gray-600" />
                <span>{player.resources.ore}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
