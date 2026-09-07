import type { BoardProps } from 'boardgame.io/react';
import type { GameCommands, GameState } from '../../game/core/types';
import { GameScreen } from '../../features/game/GameScreen';

/** The sole translation point between boardgame.io's board API and Catan's view contract. */
export function BoardgameView({ G, ctx, moves, playerID }: BoardProps<GameState>) {
  return <GameScreen G={G} ctx={ctx} moves={moves as unknown as GameCommands} playerID={playerID} />;
}
