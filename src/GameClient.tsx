import React, { useMemo } from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { CatanGame } from './game/Game';
import { Board } from './components/Board';
import { DebugBot } from './bots/DebugBot';

interface GameClientProps {
  numPlayers: number;
  playerID?: string | null;
  matchID?: string;
  onPlayerChange?: (playerID: string) => void;
  // Deprecated 'mode' prop - derived from props instead
  mode?: 'local' | 'singleplayer' | 'autoplay' | 'vs-bots';
}

export const GameClient: React.FC<GameClientProps> = (props) => {
  const { mode = 'local', numPlayers, ...clientProps } = props;

  // Determine configuration based on mode
  // Ideally, this should be passed in directly, but for now we map the legacy mode
  // to a specific configuration.

  const clientConfig = useMemo(() => {
    // 1. Single Player (Debug)
    if (mode === 'singleplayer') {
      return {
        debug: { collapseOnLoad: false },
        // No multiplayer backend needed for singleplayer debug (uses default local)
        // or we can use Local with no bots if we want explicit control
        multiplayer: undefined,
        playerIDOverride: '0',
      };
    }

    // 2. Auto Play (0 Players, 4 Bots)
    if (mode === 'autoplay') {
       return {
         debug: { collapseOnLoad: true },
         multiplayer: Local({
            bots: {
                '0': DebugBot,
                '1': DebugBot,
                '2': DebugBot,
                '3': DebugBot,
            }
         }),
         playerIDOverride: null, // Spectator
       };
    }

    // 3. Vs Bots (1 Human, N-1 Bots)
    if (mode === 'vs-bots') {
        // Dynamically create bot map for all players except Player 0
        const bots: Record<string, typeof DebugBot> = {};
        for (let i = 1; i < numPlayers; i++) {
            bots[i.toString()] = DebugBot;
        }

        return {
            debug: { collapseOnLoad: true },
            multiplayer: Local({ bots }),
            playerIDOverride: '0',
        };
    }

    // 4. Local Multiplayer (Default)
    // Pass-and-play with random bots available for replacement if needed
    return {
        debug: import.meta.env.DEV ? { collapseOnLoad: true } : false,
        multiplayer: Local({ bots: { 'random': DebugBot } }),
        playerIDOverride: clientProps.playerID, // Use passed playerID
    };
  }, [mode, numPlayers, clientProps.playerID]);


  // Dynamic Client Creation
  // Note: boardgame.io Client is a factory. We memoize the result to avoid recreating it
  // unless the structural config changes (which shouldn't happen during a game).
  const ConfiguredClient = useMemo(() => {
     return Client({
        game: CatanGame,
        board: Board,
        numPlayers: numPlayers,
        debug: clientConfig.debug,
        multiplayer: clientConfig.multiplayer,
     });
  }, [numPlayers, clientConfig.debug, clientConfig.multiplayer]);

  // Use the override if specified, otherwise fall back to props
  const finalPlayerID = clientConfig.playerIDOverride !== undefined
      ? clientConfig.playerIDOverride
      : clientProps.playerID;

  return (
    <ConfiguredClient
        {...clientProps}
        numPlayers={numPlayers}
        playerID={finalPlayerID}
    />
  );
};
