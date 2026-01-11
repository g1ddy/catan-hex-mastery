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
const SinglePlayerClient = Client({
  game: CatanGame,
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
