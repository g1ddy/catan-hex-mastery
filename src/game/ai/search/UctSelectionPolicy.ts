import type { MctsNode } from './MctsNode';
import type { SelectionPolicy } from './MctsPolicies';
import type { SearchGame } from './SearchGame';

export const DEFAULT_UCT_EXPLORATION_CONSTANT = Math.SQRT2;

export interface UctSelectionPolicyOptions {
  explorationConstant?: number;
}

/**
 * UCT (Upper Confidence Bound applied to Trees) selection policy.
 *
 * Formula:
 * UCT(parent, child) = exploitation + C * sqrt(ln(parentVisits) / childVisits)
 *
 * - `exploitation` is calculated as `child.totalReward[parent.player] / child.visits`
   from the perspective of the acting player at the parent node (`node.player`).
 * - Unvisited children (`child.visits === 0`) are given priority deterministically
   without division by zero, NaN, or Infinity.
 * - Deterministic tie-breaking selects the first child in stable child order.
 */
export class UctSelectionPolicy<S, A> implements SelectionPolicy<S, A> {
  readonly explorationConstant: number;

  constructor(options: UctSelectionPolicyOptions = {}) {
    const C = options.explorationConstant ?? DEFAULT_UCT_EXPLORATION_CONSTANT;
    if (typeof C !== 'number' || Number.isNaN(C) || C < 0) {
      throw new Error(`Invalid explorationConstant: must be a non-negative number, got ${C}`);
    }
    this.explorationConstant = C;
  }

  /**
   * Calculates the exploitation component for a child node from the perspective of parent node's player.
   */
  calculateExploitation(node: MctsNode<S, A>, child: MctsNode<S, A>): number {
    if (child.visits === 0) {
      return 0;
    }
    return (child.totalReward[node.player] ?? 0) / child.visits;
  }

  /**
   * Calculates the exploration component for a child node.
   */
  calculateExploration(parentVisits: number, childVisits: number): number {
    if (parentVisits <= 0 || childVisits <= 0) {
      return 0;
    }
    const lnParent = Math.log(parentVisits);
    if (lnParent <= 0) {
      return 0;
    }
    return this.explorationConstant * Math.sqrt(lnParent / childVisits);
  }

  /**
   * Computes total UCT score for a visited child node.
   */
  calculateScore(node: MctsNode<S, A>, child: MctsNode<S, A>): number {
    if (child.visits === 0) {
      return Number.POSITIVE_INFINITY;
    }
    const exploitation = this.calculateExploitation(node, child);
    const exploration = this.calculateExploration(node.visits, child.visits);
    return exploitation + exploration;
  }

  selectChild(node: MctsNode<S, A>, _game: SearchGame<S, A>): MctsNode<S, A> {
    if (node.children.length === 0) {
      throw new Error('Cannot select child from a node with no children');
    }

    // Unvisited children receive explicit priority (first unvisited child in stable array order)
    const unvisited = node.children.find((child) => child.visits === 0);
    if (unvisited) {
      return unvisited;
    }

    let bestChild = node.children[0];
    let bestScore = this.calculateScore(node, bestChild);

    for (let i = 1; i < node.children.length; i++) {
      const child = node.children[i];
      const score = this.calculateScore(node, child);
      // Deterministic tie-breaking: strictly greater score required to replace bestChild
      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }

    return bestChild;
  }
}
