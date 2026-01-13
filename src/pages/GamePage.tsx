import { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { GameClient } from '../GameClient';
import { DebugBot } from '../bots/DebugBot';

const MATCH_ID_REGEX = /^[a-zA-Z0-9-]+$/;

export function GamePage() {
  const location = useLocation();
  const numPlayers = location.state?.numPlayers;
  // 'mode' is strictly 'local' or 'singleplayer' now.
  // Legacy modes like 'autoplay' or 'vs-bots' are handled via botConfig.
  const mode = location.state?.mode || 'local';
  const rawMatchID = location.state?.matchID || 'default';

  // botConfig: { '0': true, '1': true } maps playerID to boolean (enable bot)
  const botConfig = location.state?.botConfig as Record<string, boolean> | undefined;

  // Sanitize matchID to prevent XSS (only allow alphanumeric and hyphens)
  const matchID = MATCH_ID_REGEX.test(rawMatchID) ? rawMatchID : 'default';

  // Determine initial playerID
  // If player 0 is a bot (e.g. AutoPlay), start as spectator (null).
  // Otherwise default to '0'.
  const initialPlayerID = botConfig && botConfig['0'] ? null : '0';

  const [playerID, setPlayerID] = useState<string | null>(initialPlayerID);

  // Construct explicit bots map for GameClient
  // Maps playerID -> BotClass
  let bots: Record<string, typeof DebugBot> | undefined;
  if (botConfig) {
      bots = {};
      Object.keys(botConfig).forEach(pid => {
          if (botConfig[pid]) {
              bots![pid] = DebugBot;
          }
      });
  }

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
