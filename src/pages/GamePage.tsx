import { useState, useMemo } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { GameClient } from '../GameClient';
import { DebugBot } from '../bots/DebugBot';

const MATCH_ID_REGEX = /^[a-zA-Z0-9-]+$/;

export function GamePage() {
  const location = useLocation();
  const numPlayers = location.state?.numPlayers;
  // 'mode' is strictly 'local' or 'singleplayer' now.
  const mode = location.state?.mode || 'local';
  const rawMatchID = location.state?.matchID || 'default';

  // numBots: total number of bots in the game
  const numBots = Number(location.state?.numBots) || 0;

  // Sanitize matchID to prevent XSS (only allow alphanumeric and hyphens)
  const matchID = MATCH_ID_REGEX.test(rawMatchID) ? rawMatchID : 'default';

  // Determine initial playerID
  // If ALL players are bots, start as spectator (null).
  // Otherwise default to '0'.
  const isAutoPlay = numBots === numPlayers;
  const initialPlayerID = isAutoPlay ? null : '0';

  const [playerID, setPlayerID] = useState<string | null>(initialPlayerID);

  // Construct explicit bots map for GameClient based on numBots
  // Bots fill seats starting from the last player index backwards.
  // Example: 3 Players, 2 Bots -> Bots are Player 1 and Player 2. (Indices 1, 2)
  // Example: 4 Players, 4 Bots -> Bots are 0, 1, 2, 3.
  const bots = useMemo(() => {
    if (!numBots || numBots <= 0 || !numPlayers) {
      return undefined;
    }

    const result: Record<string, typeof DebugBot> = {};
    const startBotIndex = numPlayers - numBots;

    for (let i = startBotIndex; i < numPlayers; i++) {
      result[i.toString()] = DebugBot;
    }

    return result;
  }, [numBots, numPlayers]);

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
        bots={bots}
      />
    </div>
  );
}
