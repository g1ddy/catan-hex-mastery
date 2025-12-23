import React from 'react';
import { GameState, Player } from '../game/types';
import './PlayerPanel.css';

interface PlayerPanelProps {
  players: GameState['players'];
  currentPlayerId: string;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({ players, currentPlayerId }) => {
  const playerList = Object.values(players);

  return (
    <div className="player-panel">
      <h3>Players</h3>
      <div className="player-panel-list">
        {playerList.map((player: Player) => (
          <div
            key={player.id}
            className={`player-card ${player.id === currentPlayerId ? 'active' : 'inactive'}`}
          >
            <div className="player-header">
              <div
                className="player-color-indicator"
                style={{ backgroundColor: player.color }}
              />
              Player {Number(player.id) + 1}
            </div>
            <div className="player-stats">
              VP: {player.victoryPoints} | Sett: {player.settlements.length} | Roads: {player.roads.length}
            </div>
            <div className="player-resources">
              W:{player.resources.wood} B:{player.resources.brick} S:{player.resources.sheep} Wh:{player.resources.wheat} O:{player.resources.ore}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
