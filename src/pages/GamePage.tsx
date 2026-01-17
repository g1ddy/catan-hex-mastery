import { useState, useMemo } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { GameClient } from '../GameClient';
import { CatanBot } from '../bots/CatanBot';
import { ConfiguredMCTSBot } from '../bots/ConfiguredBots';
import { RandomBot } from 'boardgame.io/ai';

const MATCH_ID_REGEX = /^[a-zA-Z0-9-]+$/;

// Bot Cycling Order: CatanBot -> RandomBot -> MCTSBot
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BOT_CYCLE: Array<{ class: any, name: string }> = [
    { class: CatanBot, name: 'Catan Bot' },
    { class: RandomBot, name: 'Random Bot' },
    { class: ConfiguredMCTSBot, name: 'MCTS Bot' }
];

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
  const { bots, botNames } = useMemo(() => {
    if (!numBots || numBots <= 0 || !numPlayers) {
      return { bots: undefined, botNames: undefined };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const botsResult: Record<string, any> = {};
    const botNamesResult: Record<string, string> = {};

    const startBotIndex = numPlayers - numBots;
    let botTypeIndex = 0;

    for (let i = startBotIndex; i < numPlayers; i++) {
        const botConfig = BOT_CYCLE[botTypeIndex % BOT_CYCLE.length];

        botsResult[i.toString()] = botConfig.class;
        botNamesResult[i.toString()] = botConfig.name;

        botTypeIndex++;
    }

    return { bots: botsResult, botNames: botNamesResult };
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
        setupData={{ botNames }}
      />
    </div>
  );
}
