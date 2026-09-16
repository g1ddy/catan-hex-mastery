import type { SearchGame } from './SearchGame';
import type { SearchConfig } from './SearchConfig';
import { validateSearchConfig } from './SearchConfig';
import type { SearchCandidate, SearchResult } from './SearchResult';
import type { SearchRandom } from './SearchRandom';
import { SeededSearchRandom } from './SearchRandom';
import { MctsNode } from './MctsNode';
import type {
  SearchUtility,
  SearchEvaluator,
  RolloutPolicy,
  SelectionPolicy,
  FinalSelectionStrategy,
} from './MctsPolicies';
import {
  DefaultSearchEvaluator,
  RandomRolloutPolicy,
  Ucb1SelectionPolicy,
  MostVisitedSelectionStrategy,
} from './MctsPolicies';

export interface MctsOptions<S, A> {
  selectionPolicy?: SelectionPolicy<S, A>;
  rolloutPolicy?: RolloutPolicy<S, A>;
  evaluator?: SearchEvaluator<S>;
  finalSelectionStrategy?: FinalSelectionStrategy<A>;
}

export class MctsEngine<S, A> {
  readonly selectionPolicy: SelectionPolicy<S, A>;
  readonly rolloutPolicy: RolloutPolicy<S, A>;
  readonly evaluator: SearchEvaluator<S>;
  readonly finalSelectionStrategy: FinalSelectionStrategy<A>;

  constructor(options: MctsOptions<S, A> = {}) {
    this.selectionPolicy = options.selectionPolicy ?? new Ucb1SelectionPolicy();
    this.rolloutPolicy = options.rolloutPolicy ?? new RandomRolloutPolicy();
    this.evaluator = options.evaluator ?? new DefaultSearchEvaluator();
    this.finalSelectionStrategy =
      options.finalSelectionStrategy ?? new MostVisitedSelectionStrategy();
  }

  select(node: MctsNode<S, A>, game: SearchGame<S, A>, maxDepth: number): MctsNode<S, A> {
    let curr = node;
    while (
      !curr.isTerminal &&
      curr.depth < maxDepth &&
      curr.isFullyExpanded() &&
      curr.children.length > 0
    ) {
      curr = this.selectionPolicy.selectChild(curr, game);
    }
    return curr;
  }

  expand(
    node: MctsNode<S, A>,
    game: SearchGame<S, A>,
    random: SearchRandom,
    maxDepth: number
  ): MctsNode<S, A> {
    if (node.isTerminal || node.depth >= maxDepth || node.untriedActions.length === 0) {
      return node;
    }

    const action = node.untriedActions.shift()!;
    const nextState = game.applyAction(node.state, action, random);
    const child = new MctsNode(nextState, game, node, action, node.depth + 1);
    node.children.push(child);
    return child;
  }

  rollout(
    node: MctsNode<S, A>,
    game: SearchGame<S, A>,
    random: SearchRandom,
    maxDepth: number
  ): SearchUtility {
    if (node.isTerminal) {
      return this.evaluator.evaluate(game, node.state);
    }

    let currState = node.state;
    let currDepth = node.depth;

    while (currDepth < maxDepth && !game.isTerminal(currState)) {
      const action = this.rolloutPolicy.selectAction(game, currState, random);
      if (action === null) {
        break;
      }
      currState = game.applyAction(currState, action, random);
      currDepth += 1;
    }

    return this.evaluator.evaluate(game, currState);
  }

  backpropagate(node: MctsNode<S, A> | null, utility: SearchUtility): void {
    let curr: MctsNode<S, A> | null = node;
    while (curr !== null) {
      curr.visits += 1;
      for (const pid of Object.keys(utility)) {
        curr.totalReward[pid] = (curr.totalReward[pid] ?? 0) + utility[pid];
      }
      curr = curr.parent;
    }
  }

  search(
    game: SearchGame<S, A>,
    initialState: S,
    config: SearchConfig
  ): SearchResult<A> {
    validateSearchConfig(config);

    const seed = config.seed ?? 'mcts-seed';
    const random: SearchRandom = new SeededSearchRandom(seed);
    const startTime = Date.now();

    const root = new MctsNode(initialState, game, null, null, 0);

    if (!root.isTerminal && root.untriedActions.length > 0) {
      for (let i = 0; i < config.iterations; i++) {
        const selectedNode = this.select(root, game, config.maxDepth);
        const expandedNode = this.expand(selectedNode, game, random, config.maxDepth);
        const utility = this.rollout(expandedNode, game, random, config.maxDepth);
        this.backpropagate(expandedNode, utility);
      }
    }

    const candidates: SearchCandidate<A>[] = root.children.map((child) => {
      const visits = child.visits;
      const value = visits > 0 ? (child.totalReward[root.player] ?? 0) / visits : 0;
      return {
        action: child.actionFromParent!,
        visits,
        value,
      };
    });

    const action = this.finalSelectionStrategy.selectAction(candidates);

    return {
      action,
      rootPlayer: root.player,
      iterations: config.iterations,
      rootVisits: root.visits,
      candidates,
      seed: config.seed,
      elapsedMs: Date.now() - startTime,
    };
  }
}
