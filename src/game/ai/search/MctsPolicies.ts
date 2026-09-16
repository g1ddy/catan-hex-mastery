import type { SearchGame } from './SearchGame';
import type { SearchRandom } from './SearchRandom';
import type { SearchCandidate } from './SearchResult';
import type { MctsNode } from './MctsNode';

/**
 * Absolute per-player utility vector mapping player ID -> normalized reward in [0, 1].
 */
export type SearchUtility = Readonly<Record<string, number>>;

/**
 * Seam responsible for evaluating both terminal and depth-limited non-terminal game states.
 * Evaluators receive `isTerminal: boolean` to explicitly distinguish between genuine terminal
 * state outcomes and depth-cutoff non-terminal state evaluations (such as maxDepth rollout limits).
 */
export interface SearchEvaluator<S> {
  evaluate<A>(game: SearchGame<S, A>, state: S, isTerminal: boolean): SearchUtility;
}

/**
 * Default framework-neutral evaluator.
 * - Genuine terminal states (`isTerminal === true`):
 *   - Winner: winner gets 1.0, others 0.0.
 *   - Draw: all active players get 0.5.
 * - Depth-cutoff non-terminal states (`isTerminal === false`):
 *   - Returns neutral baseline valuation (1 / numPlayers for all active players).
 */
export class DefaultSearchEvaluator<S> implements SearchEvaluator<S> {
  evaluate<A>(game: SearchGame<S, A>, state: S, isTerminal: boolean): SearchUtility {
    const players = game.getPlayers(state);
    const utility: Record<string, number> = Object.create(null);

    if (isTerminal) {
      const term = game.getTerminalResult(state);
      if (term) {
        if (term.kind === 'winner') {
          for (const p of players) {
            utility[p] = p === term.winnerId ? 1.0 : 0.0;
          }
        } else {
          for (const p of players) {
            utility[p] = 0.5;
          }
        }
      } else {
        for (const p of players) {
          utility[p] = 0.5;
        }
      }
    } else {
      const neutralValue = players.length > 0 ? 1 / players.length : 0.5;
      for (const p of players) {
        utility[p] = neutralValue;
      }
    }

    return utility;
  }
}

export interface RolloutPolicy<S, A> {
  selectAction(game: SearchGame<S, A>, state: S, random: SearchRandom): A | null;
}

export class RandomRolloutPolicy<S, A> implements RolloutPolicy<S, A> {
  selectAction(game: SearchGame<S, A>, state: S, random: SearchRandom): A | null {
    const actions = game.getLegalActions(state);
    if (actions.length === 0) {
      return null;
    }
    return random.pick(actions);
  }
}

/**
 * Tree selection policy operating on expanded nodes.
 *
 * The selection-policy seam intentionally does not prescribe UCT or another exploration
 * algorithm. #479 owns exploration-policy implementation and tuning. The default policy only
 * guarantees a deterministic, valid choice and gives unvisited children first priority so the
 * MCTS engine can make progress without embedding an exploration strategy.
 */
export interface SelectionPolicy<S, A> {
  selectChild(node: MctsNode<S, A>, game: SearchGame<S, A>): MctsNode<S, A>;
}

/**
 * Minimal deterministic selection policy for the core MCTS engine.
 *
 * Prefer the first unvisited child; once every child has been visited, choose the first child in
 * the authoritative stable child order. This is deliberately not UCT. #479 replaces or augments
 * this policy with the Catan search stack's configurable exploration policy.
 */
export class DefaultSelectionPolicy<S, A> implements SelectionPolicy<S, A> {
  selectChild(node: MctsNode<S, A>, _game: SearchGame<S, A>): MctsNode<S, A> {
    if (node.children.length === 0) {
      throw new Error('Cannot select child from a node with no children');
    }

    return node.children.find((child) => child.visits === 0) ?? node.children[0];
  }
}

export interface FinalSelectionStrategy<A> {
  selectAction(candidates: readonly SearchCandidate<A>[]): A | null;
}

export class MostVisitedSelectionStrategy<A> implements FinalSelectionStrategy<A> {
  selectAction(candidates: readonly SearchCandidate<A>[]): A | null {
    if (candidates.length === 0) {
      return null;
    }

    let bestCandidate = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      if (candidates[i].visits > bestCandidate.visits) {
        bestCandidate = candidates[i];
      }
    }

    return bestCandidate.action;
  }
}
