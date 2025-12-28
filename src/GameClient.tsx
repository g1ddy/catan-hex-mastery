import { Client } from 'boardgame.io/react';
// import { Local } from 'boardgame.io/multiplayer';
import { CatanGame } from './game/Game';
import { Board } from './components/Board';

interface GameClientProps {
  numPlayers: number;
}

export const GameClient = Client({
  game: CatanGame,
  board: Board,
  debug: import.meta.env.DEV,
  // multiplayer: Local(),
}) as unknown as React.ComponentType<GameClientProps>;
