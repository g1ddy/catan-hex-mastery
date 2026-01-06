import React from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { CatanGame } from './game/Game';
import { Board } from './components/Board';
import { DebugBot } from './bots/DebugBot';

interface GameClientProps {
  numPlayers: number;
  playerID?: string;
  matchID?: string;
  onPlayerChange?: (playerID: string) => void;
  mode?: 'local' | 'singleplayer';
}

// 1. Local Multiplayer Client (Original behavior)
// Uses 'Local' multiplayer backend. Good for pass-and-play or local bot simulation.
// Note: Built-in Debug Panel 'AI' tab is DISABLED in multiplayer modes.
const LocalClient = Client({
  game: CatanGame,
  board: Board,
  debug: import.meta.env.DEV ? { collapseOnLoad: true } : false,
  multiplayer: Local({ bots: { 'random': DebugBot } }),
}) as unknown as React.ComponentType<GameClientProps>;

// 2. Single Player / Debug Client
// No multiplayer backend. This ENABLES the full Debug Panel capabilities,
// including the 'AI' tab for driving bots via Game.ai.enumerate.
const SinglePlayerClient = Client({
  game: CatanGame,
  board: Board,
  debug: { collapseOnLoad: false }, // Always show debug panel in this mode
  // multiplayer: undefined, // Explicitly undefined to enable single-player mode
}) as unknown as React.ComponentType<GameClientProps>;

// 3. Game Client Factory / Wrapper
// Decides which client to render based on the 'mode' prop.
export const GameClient: React.FC<GameClientProps> = (props) => {
  const { mode = 'local', ...clientProps } = props;

  if (mode === 'singleplayer') {
    // In singleplayer, we typically play as player "0".
    // We override playerID to ensure it's set, though the Client handles '0' by default often.
    return <SinglePlayerClient {...clientProps} playerID="0" />;
  }

  return <LocalClient {...clientProps} />;
};
