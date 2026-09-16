import type { GameState, GameContext } from '../core/types';
import { RollStatus } from '../core/types';
import { PHASES, STAGES, WINNING_SCORE, MAX_TURNS } from '../core/constants';
import { getSnakeDraftOrder } from '../mechanics/turnOrder';

/**
 * Checks terminal conditions for Catan game.
 * Sourced centrally for runtime and search.
 */
export function checkTerminalResult(G: GameState, ctx: GameContext): { winner?: string; draw?: boolean } | null {
  if (ctx.gameover) {
    if (ctx.gameover.winner !== undefined) {
      return { winner: ctx.gameover.winner };
    }
    if (ctx.gameover.draw) {
      return { draw: true };
    }
  }

  const winner = Object.values(G.players).find(p => p.victoryPoints >= WINNING_SCORE);
  if (winner) {
    return { winner: winner.id };
  }

  if (ctx.turn > MAX_TURNS) {
    return { draw: true };
  }

  return null;
}

/**
 * Gets players sorted by numeric ID.
 */
export function getSortedPlayerIds(G: GameState): string[] {
  return Object.keys(G.players).sort((a, b) => Number(a) - Number(b));
}

/**
 * Advances turn and phase/stage lifecycle state for Catan.
 */
export function advanceCatanTurn(G: GameState, ctx: GameContext): void {
  const players = getSortedPlayerIds(G);
  const numPlayers = players.length;

  if (ctx.phase === PHASES.SETUP) {
    const draftOrder = getSnakeDraftOrder(numPlayers);
    const currentTurnIndex = ctx.turn - 1;
    const nextTurnIndex = currentTurnIndex + 1;

    if (nextTurnIndex < draftOrder.length) {
      ctx.turn = nextTurnIndex + 1;
      ctx.currentPlayer = draftOrder[nextTurnIndex];
      ctx.stagesByPlayer = { [ctx.currentPlayer]: STAGES.PLACE_SETTLEMENT };
    } else {
      // Setup phase complete, transition to normal gameplay
      ctx.phase = PHASES.GAMEPLAY;
      ctx.turn = 1;
      ctx.currentPlayer = players[0];
      ctx.stagesByPlayer = { [ctx.currentPlayer]: STAGES.ROLLING };
      G.rollStatus = RollStatus.IDLE;
    }
  } else {
    // Gameplay phase turn advancement
    const currentIndex = players.indexOf(ctx.currentPlayer);
    const nextIndex = (currentIndex + 1) % numPlayers;
    ctx.currentPlayer = players[nextIndex];
    ctx.turn += 1;
    ctx.stagesByPlayer = { [ctx.currentPlayer]: STAGES.ROLLING };
    G.rollStatus = RollStatus.IDLE;
  }
}
