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
}

const BASE_CLIENT_CONFIG = {
  game: CatanGame,
  board: Board,
  debug: import.meta.env.DEV ? { collapseOnLoad: true } : false,
};

export const LocalGameClient = Client({
  ...BASE_CLIENT_CONFIG,
  multiplayer: Local({ bots: { 'random': DebugBot } }),
}) as unknown as React.ComponentType<GameClientProps>;

export const SinglePlayerGameClient = Client({
  ...BASE_CLIENT_CONFIG,
}) as unknown as React.ComponentType<GameClientProps>;
