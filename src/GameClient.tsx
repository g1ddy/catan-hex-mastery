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
const LocalClient = Client({
  game: CatanGame,
  board: Board,
  debug: import.meta.env.DEV ? { collapseOnLoad: true } : false,
  multiplayer: Local({ bots: { 'random': DebugBot } }),
}) as unknown as React.ComponentType<GameClientProps>;

// 2. Single Player / Debug Client
// No multiplayer backend. This ENABLES the full Debug Panel capabilities.
// We wire the bot here so the AI tab has something to control.
// In Single Player mode, 'game.ai' is used if defined, or we can look for other configs.
// However, boardgame.io's debug panel often looks for bots defined in the client config
// if we are NOT using a backend.
// Wait, if we pass 'bots' to Client() directly, does it work?
// The types for Client() options include 'ai'.
// Let's try passing 'game' which already has AI?
// CatanGame probably doesn't have 'ai' property set up for MCTS.
// But we can try passing the DebugBot class to the `game` object override?
// Or we can try to use the `ai` option in Client (if it exists).
// Actually, in the latest boardgame.io, the AI visualization works best when the Game object has an 'ai' section.

const SinglePlayerClient = Client({
  game: {
    ...CatanGame,
    // We attach the bot to the game definition so the Debug Panel can find it.
    // The 'ai' property is where boardgame.io looks for bot configuration.
    ai: {
      bot: DebugBot,
      enumerate: (G: any, ctx: any) => {
         // This is a dummy enumerate just to satisfy types if needed,
         // but the Bot class itself has enumerate.
         // boardgame.io AI looks for 'bot' class.
         return [];
      }
    }
  },
  board: Board,
  debug: { collapseOnLoad: false },
  // No multiplayer property -> Single Player Client
}) as unknown as React.ComponentType<GameClientProps>;

// 3. Game Client Factory / Wrapper
export const GameClient: React.FC<GameClientProps> = (props) => {
  const { mode = 'local', ...clientProps } = props;

  if (mode === 'singleplayer') {
    return <SinglePlayerClient {...clientProps} playerID="0" />;
  }

  return <LocalClient {...clientProps} />;
};
