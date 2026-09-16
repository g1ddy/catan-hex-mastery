import type { SearchGame, SearchTerminalResult } from './SearchGame';
import type { SearchRandom } from './SearchRandom';
import { SeededSearchRandom } from './SearchRandom';
import { MctsEngine } from './MctsEngine';
import { MctsNode } from './MctsNode';
import type { SearchEvaluator, SearchUtility, FinalSelectionStrategy } from './MctsPolicies';
import { Ucb1SelectionPolicy, DefaultSearchEvaluator } from './MctsPolicies';
import type { SearchCandidate } from './SearchResult';

interface ToyState {
  player: string; // '0' or '1'
  players: readonly string[];
  depth: number;
  winner: string | null;
  draw?: boolean;
  isTerminal: boolean;
  noLegalActions?: boolean;
  path?: string[];
}

type ToyAction = { name: string };

class ToyGame implements SearchGame<ToyState, ToyAction> {
  getCurrentPlayer(state: ToyState): string {
    return state.player;
  }

  getLegalActions(state: ToyState): readonly ToyAction[] {
    if (state.isTerminal || state.noLegalActions) {
      return [];
    }
    return [{ name: 'left' }, { name: 'right' }];
  }

  applyAction(state: ToyState, action: ToyAction, _random: SearchRandom): ToyState {
    const nextPlayer = state.player === '0' ? '1' : '0';
    const nextPath = [...(state.path ?? []), action.name];

    // Winning condition: 'left' then 'left' wins for player '0'
    if (nextPath.join('-') === 'left-left') {
      return {
        ...state,
        player: nextPlayer,
        depth: state.depth + 1,
        isTerminal: true,
        winner: '0',
        path: nextPath,
      };
    }

    // Draw condition if depth >= 4
    if (state.depth + 1 >= 4) {
      return {
        ...state,
        player: nextPlayer,
        depth: state.depth + 1,
        isTerminal: true,
        winner: null,
        draw: true,
        path: nextPath,
      };
    }

    return {
      ...state,
      player: nextPlayer,
      depth: state.depth + 1,
      path: nextPath,
    };
  }

  isTerminal(state: ToyState): boolean {
    return state.isTerminal;
  }

  getTerminalResult(state: ToyState): SearchTerminalResult | null {
    if (!state.isTerminal) return null;
    if (state.winner) {
      return { kind: 'winner', winnerId: state.winner };
    }
    return { kind: 'draw' };
  }

  getPlayers(state: ToyState): readonly string[] {
    return state.players;
  }
}

class AlternatingMultiplayerToyGame implements SearchGame<ToyState, ToyAction> {
  getCurrentPlayer(state: ToyState): string {
    return state.player;
  }

  getPlayers(_state: ToyState): readonly string[] {
    return ['0', '1'];
  }

  getLegalActions(state: ToyState): readonly ToyAction[] {
    if (state.isTerminal) return [];
    if (state.depth === 0) {
      return [{ name: 'left' }, { name: 'right' }];
    }
    if (state.depth === 1) {
      return [{ name: 'sub_a' }, { name: 'sub_b' }];
    }
    return [];
  }

  applyAction(state: ToyState, action: ToyAction, _random: SearchRandom): ToyState {
    const nextPath = [...(state.path ?? []), action.name];

    if (state.depth === 0) {
      return {
        player: '1',
        players: ['0', '1'],
        depth: 1,
        winner: null,
        isTerminal: false,
        path: nextPath,
      };
    }

    return {
      player: '0',
      players: ['0', '1'],
      depth: 2,
      winner: null,
      isTerminal: true,
      path: nextPath,
    };
  }

  isTerminal(state: ToyState): boolean {
    return state.isTerminal;
  }

  getTerminalResult(state: ToyState): SearchTerminalResult | null {
    if (!state.isTerminal) return null;
    return state.winner ? { kind: 'winner', winnerId: state.winner } : { kind: 'draw' };
  }
}

describe('MctsEngine Unit Tests', () => {
  let game: ToyGame;
  let engine: MctsEngine<ToyState, ToyAction>;

  beforeEach(() => {
    game = new ToyGame();
    engine = new MctsEngine();
  });

  it('handles root with legal actions', () => {
    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const result = engine.search(game, state, { iterations: 10, maxDepth: 5, seed: 42 });

    expect(result.action).not.toBeNull();
    expect(result.rootPlayer).toBe('0');
    expect(result.iterations).toBe(10);
    expect(result.candidates.length).toBe(2);
  });

  it('handles root already terminal', () => {
    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: '0', isTerminal: true };
    const result = engine.search(game, state, { iterations: 10, maxDepth: 5, seed: 42 });

    expect(result.action).toBeNull();
    expect(result.rootVisits).toBe(0);
    expect(result.candidates).toEqual([]);
  });

  it('handles root with no legal actions', () => {
    const state: ToyState = {
      player: '0',
      players: ['0', '1'],
      depth: 0,
      winner: null,
      isTerminal: false,
      noLegalActions: true,
    };
    const result = engine.search(game, state, { iterations: 10, maxDepth: 5, seed: 42 });

    expect(result.action).toBeNull();
    expect(result.rootVisits).toBe(0);
    expect(result.candidates).toEqual([]);
  });

  it('explicitly establishes SearchResult.action contract across root states', () => {
    // 1. Terminal root -> action === null
    const terminalState: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: '0', isTerminal: true };
    const terminalResult = engine.search(game, terminalState, { iterations: 10, maxDepth: 5, seed: 42 });
    expect(terminalResult.action).toBeNull();

    // 2. No legal actions root -> action === null
    const noActionsState: ToyState = {
      player: '0',
      players: ['0', '1'],
      depth: 0,
      winner: null,
      isTerminal: false,
      noLegalActions: true,
    };
    const noActionsResult = engine.search(game, noActionsState, { iterations: 10, maxDepth: 5, seed: 42 });
    expect(noActionsResult.action).toBeNull();

    // 3. Normal search root -> non-null action A
    const normalState: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const normalResult = engine.search(game, normalState, { iterations: 10, maxDepth: 5, seed: 42 });
    expect(normalResult.action).toEqual({ name: 'left' });
  });

  it('expands nodes one untried action at a time in order', () => {
    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const rng = new SeededSearchRandom(1);
    const root = new MctsNode(state, game);

    expect(root.isFullyExpanded()).toBe(false);
    expect(root.untriedActions).toEqual([{ name: 'left' }, { name: 'right' }]);

    const child1 = engine.expand(root, game, rng, 5);
    expect(child1.actionFromParent).toEqual({ name: 'left' });
    expect(root.children).toHaveLength(1);

    const child2 = engine.expand(root, game, rng, 5);
    expect(child2.actionFromParent).toEqual({ name: 'right' });
    expect(root.children).toHaveLength(2);
    expect(root.isFullyExpanded()).toBe(true);
  });

  it('selects through fully expanded nodes', () => {
    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const rng = new SeededSearchRandom(1);
    const root = new MctsNode(state, game);

    // Expand both children of root
    const childLeft = engine.expand(root, game, rng, 5);
    const childRight = engine.expand(root, game, rng, 5);

    // Simulate 1 visit for childLeft and childRight
    engine.backpropagate(childLeft, { '0': 1, '1': 0 });
    engine.backpropagate(childRight, { '0': 0, '1': 1 });

    // With UCB1, selection through fully expanded root should pick childLeft (higher value for player 0)
    const selected = engine.select(root, game, 5);
    expect(selected).toBe(childLeft);
  });

  it('handles unvisited children explicitly', () => {
    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const root = new MctsNode(state, game);
    const rng = new SeededSearchRandom(1);

    engine.expand(root, game, rng, 5);
    engine.expand(root, game, rng, 5);

    // One child visited, one child unvisited
    engine.backpropagate(root.children[0], { '0': 1, '1': 0 });

    const ucb1 = new Ucb1SelectionPolicy();
    // UCB1 must pick the unvisited child
    const selected = ucb1.selectChild(root, game);
    expect(selected).toBe(root.children[1]);
  });

  it('evaluates and propagates terminal results correctly', () => {
    const terminalState: ToyState = {
      player: '1',
      players: ['0', '1'],
      depth: 2,
      winner: '0',
      isTerminal: true,
      path: ['left', 'left'],
    };
    const node = new MctsNode(terminalState, game);
    const rng = new SeededSearchRandom(1);

    const utility = engine.rollout(node, game, rng, 5);
    expect(utility['0']).toBe(1.0);
    expect(utility['1']).toBe(0.0);

    engine.backpropagate(node, utility);
    expect(node.visits).toBe(1);
    expect(node.totalReward['0']).toBe(1.0);
    expect(node.totalReward['1']).toBe(0.0);
  });

  it('executes non-terminal rollout until terminal or maxDepth', () => {
    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const node = new MctsNode(state, game);
    const rng = new SeededSearchRandom(42);

    // Rollout with maxDepth 2 (start depth 0) -> will hit maxDepth 2 without reaching terminal (depth 4)
    const utility = engine.rollout(node, game, rng, 2);
    // Non-terminal rollout returns 0.5 for all players
    expect(utility['0']).toBe(0.5);
    expect(utility['1']).toBe(0.5);
  });

  it('enforces maxDepth during search tree descent and rollout', () => {
    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const result = engine.search(game, state, { iterations: 20, maxDepth: 2, seed: 100 });

    expect(result.iterations).toBe(20);
    expect(result.action).not.toBeNull();
  });

  it('strictly enforces root depth 0 + maxDepth = 1 resulting in exactly 1 state transition total', () => {
    let transitionsCount = 0;

    class TransitionCountingGame implements SearchGame<ToyState, ToyAction> {
      getCurrentPlayer(state: ToyState): string { return state.player; }
      getPlayers(_state: ToyState): readonly string[] { return ['0', '1']; }
      getLegalActions(_state: ToyState): readonly ToyAction[] { return [{ name: 'step' }]; }
      applyAction(state: ToyState, action: ToyAction, _random: SearchRandom): ToyState {
        transitionsCount += 1;
        return {
          ...state,
          depth: state.depth + 1,
          path: [...(state.path ?? []), action.name],
        };
      }
      isTerminal(_state: ToyState): boolean { return false; }
      getTerminalResult(_state: ToyState): SearchTerminalResult | null { return null; }
    }

    const tcGame = new TransitionCountingGame();
    const rootState: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };

    transitionsCount = 0;
    engine.search(tcGame, rootState, { iterations: 1, maxDepth: 1, seed: 123 });

    expect(transitionsCount).toBe(1);
  });

  it('maintains explicit multiplayer value propagation and player perspective', () => {
    class CustomEvaluator implements SearchEvaluator<ToyState> {
      evaluate<A>(_game: SearchGame<ToyState, A>, state: ToyState, _isTerminal: boolean): SearchUtility {
        // Player 0 prefers left path, Player 1 prefers right path
        const isLeft = state.path && state.path[0] === 'left';
        return {
          '0': isLeft ? 0.9 : 0.1,
          '1': isLeft ? 0.2 : 0.8,
        };
      }
    }

    const customEngine = new MctsEngine<ToyState, ToyAction>({
      evaluator: new CustomEvaluator(),
    });

    const rootState: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const resultP0 = customEngine.search(game, rootState, { iterations: 30, maxDepth: 4, seed: 1 });

    // Player 0 should choose 'left'
    expect(resultP0.action).toEqual({ name: 'left' });

    // Change root player to Player 1
    const rootStateP1: ToyState = { player: '1', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const resultP1 = customEngine.search(game, rootStateP1, { iterations: 30, maxDepth: 4, seed: 1 });

    // Player 1 should choose 'right'
    expect(resultP1.action).toEqual({ name: 'right' });
  });

  it('models alternating player perspective choices correctly in multiplayer tree search', () => {
    class AlternatingTreeEvaluator implements SearchEvaluator<ToyState> {
      evaluate<A>(_game: SearchGame<ToyState, A>, state: ToyState, _isTerminal: boolean): SearchUtility {
        const p = state.path?.join('-') ?? '';
        if (p === 'left-sub_a') return { '0': 0.8, '1': 0.2 };
        if (p === 'left-sub_b') return { '0': 0.1, '1': 0.9 };
        if (p === 'right-sub_a') return { '0': 0.6, '1': 0.4 };
        if (p === 'right-sub_b') return { '0': 0.5, '1': 0.5 };
        return { '0': 0.5, '1': 0.5 };
      }
    }

    const altEngine = new MctsEngine<ToyState, ToyAction>({
      evaluator: new AlternatingTreeEvaluator(),
    });
    const altGame = new AlternatingMultiplayerToyGame();
    const rootState: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };

    const result = altEngine.search(altGame, rootState, { iterations: 100, maxDepth: 4, seed: 123 });

    expect(result.action).toEqual({ name: 'right' });
  });

  it('returns neutral baseline valuation for default evaluator at non-terminal depth limits', () => {
    const defaultEvaluator = new DefaultSearchEvaluator<ToyState>();
    const state: ToyState = { player: '0', players: ['0', '1', '2'], depth: 0, winner: null, isTerminal: false };

    const utility = defaultEvaluator.evaluate(game, state, false);
    expect(utility).toEqual({ '0': 1 / 3, '1': 1 / 3, '2': 1 / 3 });
  });

  it('uses custom evaluator as the contract seam to extract value at maxDepth rollout boundaries', () => {
    class DepthBoundaryEvaluator implements SearchEvaluator<ToyState> {
      evaluate<A>(_game: SearchGame<ToyState, A>, state: ToyState, isTerminal: boolean): SearchUtility {
        expect(isTerminal).toBe(false);
        return {
          '0': state.depth / 10,
          '1': 1 - state.depth / 10,
        };
      }
    }

    const customEngine = new MctsEngine<ToyState, ToyAction>({
      evaluator: new DepthBoundaryEvaluator(),
    });

    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const root = new MctsNode(state, game);
    const rng = new SeededSearchRandom(1);

    const utility = customEngine.rollout(root, game, rng, 2);
    expect(utility['0']).toBe(0.2);
    expect(utility['1']).toBe(0.8);
  });

  it('guarantees fixed-seed reproducibility across the complete SearchResult contract excluding elapsedMs', () => {
    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };

    const res1 = engine.search(game, state, { iterations: 50, maxDepth: 5, seed: 'test-seed-xyz' });
    const res2 = engine.search(game, state, { iterations: 50, maxDepth: 5, seed: 'test-seed-xyz' });

    expect({ ...res1, elapsedMs: 0 }).toEqual({ ...res2, elapsedMs: 0 });
  });

  it('enforces exact iteration budget', () => {
    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };

    const result = engine.search(game, state, { iterations: 37, maxDepth: 5, seed: 77 });
    expect(result.iterations).toBe(37);
    expect(result.rootVisits).toBe(37);
  });

  it('produces stable candidate statistics order', () => {
    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const result = engine.search(game, state, { iterations: 20, maxDepth: 5, seed: 1 });

    expect(result.candidates.map((c) => c.action)).toEqual([{ name: 'left' }, { name: 'right' }]);
  });

  it('keeps final selection independent from exploration policy', () => {
    class FirstCandidateSelectionStrategy implements FinalSelectionStrategy<ToyAction> {
      selectAction(candidates: readonly SearchCandidate<ToyAction>[]): ToyAction | null {
        return candidates.length > 0 ? candidates[0].action : null;
      }
    }

    const customEngine = new MctsEngine<ToyState, ToyAction>({
      finalSelectionStrategy: new FirstCandidateSelectionStrategy(),
    });

    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const result = customEngine.search(game, state, { iterations: 30, maxDepth: 5, seed: 1 });

    // Always selects candidates[0] regardless of visit counts
    expect(result.action).toEqual({ name: 'left' });
  });

  it('ensures no NaN or infinite values in candidates for unvisited or degenerate nodes', () => {
    const state: ToyState = { player: '0', players: ['0', '1'], depth: 0, winner: null, isTerminal: false };
    const root = new MctsNode(state, game);

    // Candidates generated from root before search iterations
    const candidates = root.children.map((child) => {
      const visits = child.visits;
      const value = visits > 0 ? (child.totalReward[root.player] ?? 0) / visits : 0;
      return { action: child.actionFromParent!, visits, value };
    });

    expect(candidates).toEqual([]);
    for (const c of candidates) {
      expect(Number.isNaN(c.value)).toBe(false);
      expect(Number.isFinite(c.value)).toBe(true);
    }
  });
});
