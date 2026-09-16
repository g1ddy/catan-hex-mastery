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
 * Custom evaluators (e.g., Catan-aware heuristic evaluation in #480) implement this contract
 * to extract heuristic value at maxDepth rollout boundaries.
 */
export interface SearchEvaluator<S> {
  evaluate<A>(game: SearchGame<S, A>, state: S): SearchUtility;
}

/**
 * Default framework-neutral evaluator.
 * - Terminal winner: winner gets 1.0, others 0.0.
 * - Terminal draw: all active players get 0.5.
 * - Non-terminal depth limit: returns neutral baseline (1 / numPlayers for all active players).
 */
export class DefaultSearchEvaluator<S> implements SearchEvaluator<S> {
  evaluate<A>(game: SearchGame<S, A>, state: S): SearchUtility {
    const players = game.getPlayers(state);
    const utility: Record<string, number> = Object.create(null);
    const neutralValue = players.length > 0 ? 1 / players.length : 0.5;

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
 * Selection evaluates candidate child nodes from the perspective of the acting player at the parent node (`node.player`).
 */
export interface SelectionPolicy<S, A> {
  selectChild(node: MctsNode<S, A>, game: SearchGame<S, A>): MctsNode<S, A>;
}

/**
 * Standard UCB1 tree selection policy.
 * For a parent node N with active player P = N.player, evaluates each child C using P's reward:
 *   score(C) = meanValue_P(C) + explorationConstant * sqrt(ln(N.visits) / C.visits)
 * where meanValue_P(C) = C.totalReward[P] / C.visits.
 */
export class Ucb1SelectionPolicy<S, A> implements SelectionPolicy<S, A> {
  constructor(public readonly explorationConstant: number = Math.SQRT2) {}

  selectChild(node: MctsNode<S, A>, _game: SearchGame<S, A>): MctsNode<S, A> {
    if (node.children.length === 0) {
      throw new Error('Cannot select child from a node with no children');
    }

    const parentPlayer = node.player;
    let bestChild: MctsNode<S, A> = node.children[0];
    let bestScore = -Infinity;

    for (const child of node.children) {
      if (child.visits === 0) {
        return child;
      }

      const meanValue = (child.totalReward[parentPlayer] ?? 0) / child.visits;
      const exploration =
        this.explorationConstant * Math.sqrt(Math.log(node.visits) / child.visits);
      const score = meanValue + exploration;

      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }

    return bestChild;
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
