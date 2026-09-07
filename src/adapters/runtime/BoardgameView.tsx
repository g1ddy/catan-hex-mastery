import type { BoardProps } from 'boardgame.io/react';
import type { GameCommands, GameState } from '../../game/core/types';
import { GameScreen } from '../../features/game/GameScreen';
import { toGameContext } from './boardgameMoves';

export interface BoardgameViewProps extends BoardProps<GameState> {
  onPlayerChange?: (playerID: string) => void;
}

/** The sole translation point between boardgame.io's board API and Catan's view contract. */
export function BoardgameView({ G, ctx, moves, playerID, onPlayerChange }: BoardgameViewProps) {
  return <GameScreen G={G} ctx={toGameContext(ctx)} moves={moves as unknown as GameCommands}
    playerID={playerID} onPlayerChange={onPlayerChange} />;
}
