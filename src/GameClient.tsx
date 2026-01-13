import React from 'react';
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
  mode?: 'local' | 'singleplayer' | 'autoplay';
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

// 3. Auto Play Client (4 Bots)
// Configure Local with explicit bot mapping for players 0-3
const AutoPlayClient = Client({
  game: CatanGame,
  board: Board,
  debug: { collapseOnLoad: true }, // Hide debug panel to focus on board
  multiplayer: Local({
    bots: {
      '0': DebugBot,
      '1': DebugBot,
      '2': DebugBot,
      '3': DebugBot,
    }
  }),
}) as unknown as React.ComponentType<GameClientProps>;

// 4. Game Client Factory / Wrapper
export const GameClient: React.FC<GameClientProps> = (props) => {
  const { mode = 'local', ...clientProps } = props;

  if (mode === 'singleplayer') {
    return <SinglePlayerClient {...clientProps} playerID="0" />;
  }

  if (mode === 'autoplay') {
    // For auto-play, we pass playerID=null (spectator) and let the bots configured in Local take over
    return <AutoPlayClient {...clientProps} playerID={null} />;
  }

  return <LocalClient {...clientProps} />;
};
