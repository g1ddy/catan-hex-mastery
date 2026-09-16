import type { GameRandom } from '../../core/types';
import type { SearchGame, SearchTerminalResult } from '../search/SearchGame';
import type { SearchRandom } from '../search/SearchRandom';
import type { CatanSearchState } from './CatanSearchState';
import type { CatanSearchAction } from './CatanSearchAction';
import { enumerate } from '../../rules/enumerator';
import { checkTerminalResult, getSortedPlayerIds } from '../../rules/lifecycle';
import { executeCatanMove } from '../../moves/execution';

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
 * Implements SearchGame<CatanSearchState, CatanSearchAction> as a thin wrapper
 * around authoritative Catan rule, execution, and lifecycle engines.
 */
export class CatanSearchGame implements SearchGame<CatanSearchState, CatanSearchAction> {
  getCurrentPlayer(state: CatanSearchState): string {
    return state.context.currentPlayer;
  }

  getPlayers(state: CatanSearchState): readonly string[] {
    return getSortedPlayerIds(state.game);
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
    const result = checkTerminalResult(state.game, state.context);
    if (!result) return null;

    if (result.winner !== undefined) {
      return { kind: 'winner', winnerId: result.winner };
    }
    if (result.draw) {
      return { kind: 'draw' };
    }
    return null;
  }

  applyAction(
    state: CatanSearchState,
    action: CatanSearchAction,
    random: SearchRandom
  ): CatanSearchState {
    const gameRandom = createGameRandomAdapter(random);
    const { G, ctx } = executeCatanMove(state.game, state.context, action, gameRandom);

    return { game: G, context: ctx };
  }
}
