import React, { useMemo } from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { Ctx, DefaultPluginAPIs } from 'boardgame.io';
import { CatanGame } from './game/Game';
import { GameScreen } from './features/game/GameScreen';
import { CatanBot } from './bots/CatanBot';
import { Bot } from 'boardgame.io/ai';

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
  bots?: Record<string, typeof Bot>;

  // Data passed to Game.setup
  setupData?: { botNames?: Record<string, string> };
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
    // - If `bots` prop is provided, use it.
    // - Otherwise, just use standard Local backend with a default bot available (Pass & Play support).
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
     // Inject setupData by wrapping the game object
     // This works because Local backend runs within this client instance
     const GameWithSetupData = {
        ...CatanGame,
        // Inject setupData into the setup call.
        // We assume CatanGame.setup exists (it does).
        setup: (context: Record<string, unknown> & DefaultPluginAPIs & { ctx: Ctx }) => CatanGame.setup!(context, setupData)
     };

     return Client({
        game: GameWithSetupData,
        board: GameScreen,
        numPlayers: numPlayers,
        debug: clientConfig.debug,
        multiplayer: clientConfig.multiplayer,
     });
  }, [numPlayers, clientConfig.debug, clientConfig.multiplayer, setupData]);

  const rawPlayerID = clientConfig.playerIDOverride !== undefined
      ? clientConfig.playerIDOverride
      : clientProps.playerID;

  // Coerce null to undefined for boardgame.io Client (spectator mode)
  const finalPlayerID = rawPlayerID === null ? undefined : rawPlayerID;

  return (

    <ConfiguredClient
        {...clientProps}
        playerID={finalPlayerID}
    />
  );
};
