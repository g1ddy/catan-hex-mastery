import { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { LocalGameClient, SinglePlayerGameClient } from '../GameClient';

export function GamePage() {
  const location = useLocation();
  const numPlayers = location.state?.numPlayers;
  const mode = location.state?.mode || 'local';
  const [playerID, setPlayerID] = useState('0');

  if (!numPlayers) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="game-page">
      {mode === 'singleplayer' ? (
        <SinglePlayerGameClient
          numPlayers={numPlayers}
          matchID="default"
          playerID="0" // Singleplayer always plays as Player 0
        />
      ) : (
        <LocalGameClient
          numPlayers={numPlayers}
          matchID="default"
          playerID={playerID}
          onPlayerChange={setPlayerID}
        />
      )}
    </div>
  );
}
