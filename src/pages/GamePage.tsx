import { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { GameClient } from '../GameClient';

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
      <GameClient
        numPlayers={numPlayers}
        matchID="default"
        playerID={playerID}
        onPlayerChange={setPlayerID}
        mode={mode}
      />
    </div>
  );
}
