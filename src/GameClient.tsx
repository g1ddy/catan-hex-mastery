import { Client } from 'boardgame.io/react';
import { CatanGame } from './game/Game';
import { Board } from './components/Board';

export const GameClient = Client({
  game: CatanGame,
  board: Board,
  debug: true,
});
