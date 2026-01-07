import React from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { CatanGame } from './game/Game';
import { Board } from './components/Board';
import { DebugBot, enumerateMoves } from './bots/DebugBot';
import { GameState } from './game/types';
import { Coach } from './game/analysis/coach';
import { Ctx } from 'boardgame.io';

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
const SinglePlayerClient = Client({
  game: {
    ...CatanGame,
    // Provide AI configuration to enable the Debug Panel's AI tab.
    // We implement 'enumerate' to bridge boardgame.io's AI interface with our BotCoach logic.
    ai: {
      enumerate: (G: GameState, ctx: Ctx & { coach?: Coach }, playerID: string) => {
        return enumerateMoves(G, ctx, playerID);
      }
    }
  },
  board: Board,
  debug: { collapseOnLoad: false },
}) as unknown as React.ComponentType<GameClientProps>;

// 3. Game Client Factory / Wrapper
export const GameClient: React.FC<GameClientProps> = (props) => {
  const { mode = 'local', ...clientProps } = props;

  if (mode === 'singleplayer') {
    return <SinglePlayerClient {...clientProps} playerID="0" />;
  }

  return <LocalClient {...clientProps} />;
};
