import React from 'react';
import { GameState, Player } from '../game/types';

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
            <div style={{ fontSize: '0.8rem', marginTop: '2px', color: '#555' }}>
              W:{player.resources.wood} B:{player.resources.brick} S:{player.resources.sheep} Wh:{player.resources.wheat} O:{player.resources.ore}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
