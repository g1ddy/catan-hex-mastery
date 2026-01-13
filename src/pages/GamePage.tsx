import { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { GameClient } from '../GameClient';

const MATCH_ID_REGEX = /^[a-zA-Z0-9-]+$/;

export function GamePage() {
  const location = useLocation();
  const numPlayers = location.state?.numPlayers;
  const mode = location.state?.mode || 'local';
  const rawMatchID = location.state?.matchID || 'default';

  // Sanitize matchID to prevent XSS (only allow alphanumeric and hyphens)
  const matchID = MATCH_ID_REGEX.test(rawMatchID) ? rawMatchID : 'default';

  // Default to player '0' for local/singleplayer, but null (spectator) for autoplay
  const [playerID, setPlayerID] = useState<string | null>(mode === 'autoplay' ? null : '0');

  if (!numPlayers) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="game-page">
      <GameClient
        numPlayers={numPlayers}
        matchID={matchID}
        playerID={playerID}
        onPlayerChange={(id) => setPlayerID(id)}
        mode={mode}
      />
    </div>
  );
}
