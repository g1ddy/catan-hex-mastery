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
    <div className="player-panel" style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      background: 'rgba(255, 255, 255, 0.9)',
      padding: '10px',
      borderRadius: '8px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      zIndex: 100
    }}>
      <h3>Players</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {playerList.map((player: Player) => (
          <div key={player.id} style={{
            border: player.id === currentPlayerId ? '2px solid black' : '1px solid #ccc',
            padding: '5px',
            borderRadius: '4px',
            backgroundColor: player.id === currentPlayerId ? '#f0f0f0' : 'transparent'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: player.color, borderRadius: '50%' }}></div>
              Player {Number(player.id) + 1}
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              VP: {player.victoryPoints} | Sett: {player.settlements.length} | Roads: {player.roads.length}
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', marginTop: '4px', color: '#555', alignItems: 'center' }}>
              <div title="Wood" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Trees size={14} className="stroke-green-700" />
                <span>{player.resources.wood}</span>
              </div>
              <div title="Brick" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <BrickWall size={14} className="stroke-red-700" />
                <span>{player.resources.brick}</span>
              </div>
              <div title="Sheep" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Cloud size={14} className="stroke-green-400" />
                <span>{player.resources.sheep}</span>
              </div>
              <div title="Wheat" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Wheat size={14} className="stroke-yellow-600" />
                <span>{player.resources.wheat}</span>
              </div>
              <div title="Ore" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
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
