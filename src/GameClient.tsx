import React, { useMemo } from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { CatanGame } from './game/Game';
import { Board } from './components/Board';
import { CatanBot } from './bots/CatanBot';

interface GameClientProps {
  numPlayers: number;
  playerID?: string | null;
  matchID?: string;
  onPlayerChange?: (playerID: string) => void;
  // 'singleplayer' enables the debug panel and specific dev features.
  // 'local' is the standard multiplayer backend (used for Pass & Play, AutoBot, VsBot).
  mode?: 'local' | 'singleplayer';

  // Optional configuration for bots in 'local' mode
  // If provided, these specific bots are assigned to seats.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bots?: Record<string, any>;

  // Data passed to Game.setup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupData?: any;
}

export const GameClient: React.FC<GameClientProps> = (props) => {
  const { mode = 'local', numPlayers, bots, setupData, ...clientProps } = props;

  // Configuration Logic
  const clientConfig = useMemo(() => {
    // 1. Single Player (Debug Mode)
    // Uses default local backend (no explicit bots required, usually human vs empty/debug)
    // Enables the Debug Panel (collapseOnLoad: false)
    if (mode === 'singleplayer') {
      return {
        debug: { collapseOnLoad: false },
        multiplayer: undefined,
        playerIDOverride: '0',
      };
    }

    // 2. Local Multiplayer (Standard / AutoPlay / VsBot)
    // - If `bots` prop is provided (e.g., AutoPlay, VsBot), use it to configure fixed bots.
    // - Otherwise, default to 'random' bot availability for Pass & Play.
    const multiplayerConfig = bots
        ? Local({ bots })
        : Local({ bots: { 'random': CatanBot } });

    return {
        debug: import.meta.env.DEV ? { collapseOnLoad: true } : false,
        multiplayer: multiplayerConfig,
        // In local mode, we respect the passed playerID (which might be null for spectator/autoplay)
        playerIDOverride: undefined,
    };
  }, [mode, bots]);


  // Dynamic Client Creation
  const ConfiguredClient = useMemo(() => {
     return Client({
        game: CatanGame,
        board: Board,
        numPlayers: numPlayers,
        debug: clientConfig.debug,
        multiplayer: clientConfig.multiplayer,
     });
  }, [numPlayers, clientConfig.debug, clientConfig.multiplayer]);

  const rawPlayerID = clientConfig.playerIDOverride !== undefined
      ? clientConfig.playerIDOverride
      : clientProps.playerID;

  // Coerce null to undefined for boardgame.io Client (spectator mode)
  const finalPlayerID = rawPlayerID === null ? undefined : rawPlayerID;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <ConfiguredClient
        {...clientProps}
        playerID={finalPlayerID}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setupData={setupData as any}
    />
  );
};
