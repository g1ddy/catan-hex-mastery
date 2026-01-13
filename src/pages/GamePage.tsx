import { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { GameClient } from '../GameClient';

export function GamePage() {
  const location = useLocation();
  const numPlayers = location.state?.numPlayers;
  const mode = location.state?.mode || 'local';

  // Default to player '0' for local/singleplayer, but null (spectator) for autoplay
  const [playerID, setPlayerID] = useState<string | null>(mode === 'autoplay' ? null : '0');

  if (!numPlayers) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="game-page">
      <GameClient
        numPlayers={numPlayers}
        matchID="default"
        playerID={playerID}
        onPlayerChange={(id) => setPlayerID(id)}
        mode={mode}
      />
    </div>
  );
}
