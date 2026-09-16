import type { SearchGame } from './SearchGame';
import type { SearchRandom } from './SearchRandom';
import type { SearchCandidate } from './SearchResult';
import type { MctsNode } from './MctsNode';

export type SearchUtility = Readonly<Record<string, number>>;

export interface SearchEvaluator<S> {
  evaluate<A>(game: SearchGame<S, A>, state: S): SearchUtility;
}

export class DefaultSearchEvaluator<S> implements SearchEvaluator<S> {
  evaluate<A>(game: SearchGame<S, A>, state: S): SearchUtility {
    const players = game.getPlayers(state);
    const utility: Record<string, number> = Object.create(null);

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

export interface SelectionPolicy<S, A> {
  selectChild(node: MctsNode<S, A>, game: SearchGame<S, A>): MctsNode<S, A>;
}

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
