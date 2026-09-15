import type { GameState, GameContext, GameRandom, MoveHandler } from '../../core/types';
import { RollStatus } from '../../core/types';
import type { SearchGame, SearchTerminalResult } from '../search/SearchGame';
import type { SearchRandom } from '../search/SearchRandom';
import type { CatanSearchState } from './CatanSearchState';
import type { CatanSearchAction } from './CatanSearchAction';
import { WINNING_SCORE, PHASES, STAGES } from '../../core/constants';
import { enumerate } from '../../rules/enumerator';
import { getSnakeDraftOrder } from '../../mechanics/turnOrder';
import { buildRoad, buildSettlement, buildCity, endTurn } from '../../moves/build';
import { placeSettlement, placeRoad, regenerateBoard } from '../../moves/setup';
import { tradeBank } from '../../moves/trade';
import { rollDice, resolveRoll } from '../../moves/roll';
import { dismissRobber } from '../../moves/robber';

const MAX_TURNS = 200;

// Registry of Catan move handlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MOVE_HANDLERS: Record<string, MoveHandler<any[]>> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildRoad: buildRoad as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildSettlement: buildSettlement as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildCity: buildCity as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tradeBank: tradeBank as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  endTurn: endTurn as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  placeSettlement: placeSettlement as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  placeRoad: placeRoad as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  regenerateBoard: regenerateBoard as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rollDice: rollDice as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveRoll: resolveRoll as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dismissRobber: dismissRobber as MoveHandler<any[]>,
};

/**
 * Creates an adapter wrapping SearchRandom into the Catan GameRandom contract.
 */
function createGameRandomAdapter(random: SearchRandom): GameRandom {
  return {
    Die: (sides: number) => random.die(sides),
    Shuffle: <T>(values: T[]): T[] => {
      const arr = [...values];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = random.integer(i + 1);
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }
      return arr;
    },
  };
}

/**
 * Framework-neutral Catan search game adapter.
 * Implements SearchGame<CatanSearchState, CatanSearchAction>.
 */
export class CatanSearchGame implements SearchGame<CatanSearchState, CatanSearchAction> {
  getCurrentPlayer(state: CatanSearchState): string {
    return state.context.currentPlayer;
  }

  getPlayers(state: CatanSearchState): readonly string[] {
    return Object.keys(state.game.players).sort((a, b) => Number(a) - Number(b));
  }

  getLegalActions(state: CatanSearchState): readonly CatanSearchAction[] {
    if (this.isTerminal(state)) {
      return [];
    }
    const currentPlayer = this.getCurrentPlayer(state);
    const actions = enumerate(state.game, state.context, currentPlayer);
    return actions as readonly CatanSearchAction[];
  }

  isTerminal(state: CatanSearchState): boolean {
    return this.getTerminalResult(state) !== null;
  }

  getTerminalResult(state: CatanSearchState): SearchTerminalResult | null {
    if (state.context.gameover) {
      if (state.context.gameover.winner !== undefined) {
        return { kind: 'winner', winnerId: state.context.gameover.winner };
      }
      if (state.context.gameover.draw) {
        return { kind: 'draw' };
      }
    }

    const winner = Object.values(state.game.players).find(p => p.victoryPoints >= WINNING_SCORE);
    if (winner) {
      return { kind: 'winner', winnerId: winner.id };
    }

    if (state.context.turn > MAX_TURNS) {
      return { kind: 'draw' };
    }

    return null;
  }

  applyAction(
    state: CatanSearchState,
    action: CatanSearchAction,
    random: SearchRandom
  ): CatanSearchState {
    const nextGame: GameState = JSON.parse(JSON.stringify(state.game));
    const nextContext: GameContext = JSON.parse(JSON.stringify(state.context));

    const handler = MOVE_HANDLERS[action.move];
    if (!handler) {
      throw new Error(`Unknown move handler for move: ${action.move}`);
    }

    let endTurnCalled = false;
    let nextActiveStage: string | undefined;

    const gameRandomAdapter = createGameRandomAdapter(random);

    const moveContext = {
      G: nextGame,
      ctx: nextContext,
      events: {
        endTurn: () => {
          endTurnCalled = true;
        },
        setActivePlayers: (stages: Partial<Record<string, string>>) => {
          if (stages.currentPlayer) {
            nextActiveStage = stages.currentPlayer;
          }
        },
      },
      random: gameRandomAdapter,
    };

    // Execute move handler
    const args = action.args || [];
    handler(moveContext, ...args);

    // Process lifecycle transitions
    if (nextActiveStage) {
      nextContext.stagesByPlayer = {
        [nextContext.currentPlayer]: nextActiveStage as GameContext['stagesByPlayer'] extends Partial<Record<string, infer S>> ? S : never
      };
    }

    if (endTurnCalled) {
      this.advanceTurn(nextGame, nextContext);
    }

    // Check game over state after move
    const winner = Object.values(nextGame.players).find(p => p.victoryPoints >= WINNING_SCORE);
    if (winner) {
      nextContext.gameover = { winner: winner.id };
      nextContext.phase = PHASES.GAME_OVER;
    } else if (nextContext.turn > MAX_TURNS) {
      nextContext.gameover = { draw: true };
      nextContext.phase = PHASES.GAME_OVER;
    }

    return {
      game: nextGame,
      context: nextContext,
    };
  }

  private advanceTurn(G: GameState, ctx: GameContext): void {
    const players = this.getPlayersForState(G);
    const numPlayers = players.length;

    if (ctx.phase === PHASES.SETUP) {
      const draftOrder = getSnakeDraftOrder(numPlayers);
      // turn is 1-indexed in ctx
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

  private getPlayersForState(G: GameState): string[] {
    return Object.keys(G.players).sort((a, b) => Number(a) - Number(b));
  }
}
