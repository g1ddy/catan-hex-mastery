import type { SearchGame } from './SearchGame';

/**
 * Represents a node in the Monte Carlo Search Tree.
 *
 * Player perspective semantics:
 * - `player` is the active acting player at `state` (i.e. `game.getCurrentPlayer(state)`).
 * - `totalReward[pid]` accumulates absolute simulation utility for each player ID `pid`.
 * - When parent node N evaluates child C, selection evaluates C's mean utility from N.player's perspective: `C.totalReward[N.player] / C.visits`.
 */
export class MctsNode<S, A> {
  readonly state: S;
  readonly player: string;
  readonly parent: MctsNode<S, A> | null;
  readonly actionFromParent: A | null;
  readonly depth: number;
  readonly untriedActions: A[];
  readonly children: MctsNode<S, A>[] = [];
  visits: number = 0;
  readonly totalReward: Record<string, number> = Object.create(null);
  readonly isTerminal: boolean;

  constructor(
    state: S,
    game: SearchGame<S, A>,
    parent: MctsNode<S, A> | null = null,
    actionFromParent: A | null = null,
    depth: number = 0
  ) {
    this.state = state;
    this.player = game.getCurrentPlayer(state);
    this.parent = parent;
    this.actionFromParent = actionFromParent;
    this.depth = depth;
    this.isTerminal = game.isTerminal(state);
    this.untriedActions = this.isTerminal ? [] : [...game.getLegalActions(state)];

    for (const pid of game.getPlayers(state)) {
      this.totalReward[pid] = 0;
    }
  }

  isFullyExpanded(): boolean {
    return this.untriedActions.length === 0;
  }
}
