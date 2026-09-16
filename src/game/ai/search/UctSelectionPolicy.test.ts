import type { SearchGame, SearchTerminalResult } from './SearchGame';
import type { SearchRandom } from './SearchRandom';
import { MctsEngine } from './MctsEngine';
import { MctsNode } from './MctsNode';
import { UctSelectionPolicy, DEFAULT_UCT_EXPLORATION_CONSTANT } from './UctSelectionPolicy';
import type { SearchEvaluator, SearchUtility } from './MctsPolicies';

interface DummyState {
  player: string;
  players: readonly string[];
  lastAction?: string;
}

type DummyAction = { id: string };

class DummyGame implements SearchGame<DummyState, DummyAction> {
  getCurrentPlayer(state: DummyState): string {
    return state.player;
  }
  getPlayers(state: DummyState): readonly string[] {
    return state.players;
  }
  getLegalActions(_state: DummyState): readonly DummyAction[] {
    return [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  }
  applyAction(state: DummyState, action: DummyAction, _random: SearchRandom): DummyState {
    return { ...state, lastAction: action.id };
  }
  isTerminal(_state: DummyState): boolean {
    return false;
  }
  getTerminalResult(_state: DummyState): SearchTerminalResult | null {
    return null;
  }
}

describe('UctSelectionPolicy Unit Tests', () => {
  const game = new DummyGame();

  it('uses DEFAULT_UCT_EXPLORATION_CONSTANT (sqrt(2)) when no options provided', () => {
    const policy = new UctSelectionPolicy();
    expect(policy.explorationConstant).toBe(DEFAULT_UCT_EXPLORATION_CONSTANT);
  });

  it('throws an error for invalid explorationConstant values', () => {
    expect(() => new UctSelectionPolicy({ explorationConstant: -1 })).toThrow(
      'Invalid explorationConstant'
    );
    expect(() => new UctSelectionPolicy({ explorationConstant: NaN })).toThrow(
      'Invalid explorationConstant'
    );
  });

  it('calculates exploitation from the parent node player perspective', () => {
    const policy = new UctSelectionPolicy();
    const parentState: DummyState = { player: 'p1', players: ['p0', 'p1', 'p2'] };
    const parentNode = new MctsNode(parentState, game);

    const childState: DummyState = { player: 'p2', players: ['p0', 'p1', 'p2'] };
    const childNode = new MctsNode(childState, game, parentNode);
    childNode.visits = 10;
    childNode.totalReward['p0'] = 2.0;
    childNode.totalReward['p1'] = 7.0; // 7.0 / 10 = 0.7 for p1
    childNode.totalReward['p2'] = 1.0;

    const exp = policy.calculateExploitation(parentNode, childNode);
    expect(exp).toBeCloseTo(0.7);
  });

  it('returns zero exploration when parentVisits <= 1 or childVisits <= 0', () => {
    const policy = new UctSelectionPolicy({ explorationConstant: 1.414 });
    expect(policy.calculateExploration(1, 5)).toBe(0); // ln(1) = 0
    expect(policy.calculateExploration(0, 5)).toBe(0);
    expect(policy.calculateExploration(10, 0)).toBe(0);
  });

  it('increases exploration pressure when C is larger', () => {
    const policyLowC = new UctSelectionPolicy({ explorationConstant: 0.5 });
    const policyHighC = new UctSelectionPolicy({ explorationConstant: 2.0 });

    const parentVisits = 100;
    const childVisits = 10;

    const exploreLow = policyLowC.calculateExploration(parentVisits, childVisits);
    const exploreHigh = policyHighC.calculateExploration(parentVisits, childVisits);

    expect(exploreHigh).toBeGreaterThan(exploreLow);
    expect(exploreHigh / exploreLow).toBeCloseTo(4.0);
  });

  it('increases exploration pressure when parent visit count increases', () => {
    const policy = new UctSelectionPolicy({ explorationConstant: 1.0 });
    const childVisits = 10;

    const exploreP100 = policy.calculateExploration(100, childVisits);
    const exploreP1000 = policy.calculateExploration(1000, childVisits);

    expect(exploreP1000).toBeGreaterThan(exploreP100);
  });

  it('reduces exploration pressure when child visit count increases', () => {
    const policy = new UctSelectionPolicy({ explorationConstant: 1.0 });
    const parentVisits = 100;

    const exploreC10 = policy.calculateExploration(parentVisits, 10);
    const exploreC50 = policy.calculateExploration(parentVisits, 50);

    expect(exploreC10).toBeGreaterThan(exploreC50);
  });

  it('handles unvisited children explicitly with priority and no NaN/Infinity', () => {
    const policy = new UctSelectionPolicy();
    const parentState: DummyState = { player: 'p0', players: ['p0', 'p1'] };
    const parentNode = new MctsNode(parentState, game);

    // Manually push 2 children
    const child1 = new MctsNode(parentState, game, parentNode, { id: 'a' });
    child1.visits = 5;
    child1.totalReward['p0'] = 4.0;

    const child2 = new MctsNode(parentState, game, parentNode, { id: 'b' });
    child2.visits = 0; // Unvisited

    parentNode.children.push(child1, child2);

    const selected = policy.selectChild(parentNode, game);
    expect(selected).toBe(child2);

    const score1 = policy.calculateScore(parentNode, child1);
    const score2 = policy.calculateScore(parentNode, child2);

    expect(Number.isNaN(score1)).toBe(false);
    expect(Number.isFinite(score1)).toBe(true);
    expect(score2).toBe(Number.POSITIVE_INFINITY);
  });

  it('handles normalized utilities consistently across positive, neutral, and negative ranges', () => {
    const policy = new UctSelectionPolicy();
    const parentState: DummyState = { player: 'p0', players: ['p0', 'p1'] };
    const parentNode = new MctsNode(parentState, game);

    const childPos = new MctsNode(parentState, game, parentNode, { id: 'pos' });
    childPos.visits = 10;
    childPos.totalReward['p0'] = 8.0; // 0.8

    const childNeu = new MctsNode(parentState, game, parentNode, { id: 'neu' });
    childNeu.visits = 10;
    childNeu.totalReward['p0'] = 5.0; // 0.5

    const childNeg = new MctsNode(parentState, game, parentNode, { id: 'neg' });
    childNeg.visits = 10;
    childNeg.totalReward['p0'] = -2.0; // -0.2

    expect(policy.calculateExploitation(parentNode, childPos)).toBeCloseTo(0.8);
    expect(policy.calculateExploitation(parentNode, childNeu)).toBeCloseTo(0.5);
    expect(policy.calculateExploitation(parentNode, childNeg)).toBeCloseTo(-0.2);
  });

  it('resolves equal UCT scores deterministically using stable child array order', () => {
    const policy = new UctSelectionPolicy({ explorationConstant: 1.0 });
    const parentState: DummyState = { player: 'p0', players: ['p0', 'p1'] };
    const parentNode = new MctsNode(parentState, game);
    parentNode.visits = 100;

    const childA = new MctsNode(parentState, game, parentNode, { id: 'a' });
    childA.visits = 10;
    childA.totalReward['p0'] = 5.0;

    const childB = new MctsNode(parentState, game, parentNode, { id: 'b' });
    childB.visits = 10;
    childB.totalReward['p0'] = 5.0; // Identical score to childA

    parentNode.children.push(childA, childB);

    const scoreA = policy.calculateScore(parentNode, childA);
    const scoreB = policy.calculateScore(parentNode, childB);
    expect(scoreA).toEqual(scoreB);

    // Selection must return childA (first in stable order)
    const selected = policy.selectChild(parentNode, game);
    expect(selected).toBe(childA);
  });

  it('evaluates multiplayer utility vectors using the active parent decision-maker player', () => {
    const policy = new UctSelectionPolicy();

    // Node player is 'p1', not 'p0'
    const parentState: DummyState = { player: 'p1', players: ['p0', 'p1', 'p2'] };
    const parentNode = new MctsNode(parentState, game);
    parentNode.visits = 50;

    const childA = new MctsNode(parentState, game, parentNode, { id: 'a' });
    childA.visits = 10;
    childA.totalReward['p0'] = 9.0; // High for p0
    childA.totalReward['p1'] = 1.0; // Low for p1

    const childB = new MctsNode(parentState, game, parentNode, { id: 'b' });
    childB.visits = 10;
    childB.totalReward['p0'] = 2.0; // Low for p0
    childB.totalReward['p1'] = 8.0; // High for p1

    parentNode.children.push(childA, childB);

    const selected = policy.selectChild(parentNode, game);
    expect(selected).toBe(childB);
  });

  it('can be injected into MctsEngine without modifying engine algorithm', () => {
    const customPolicy = new UctSelectionPolicy<DummyState, DummyAction>({ explorationConstant: 0.5 });
    const engine = new MctsEngine<DummyState, DummyAction>({
      selectionPolicy: customPolicy,
    });

    const rootState: DummyState = { player: 'p0', players: ['p0', 'p1'] };
    const result = engine.search(game, rootState, { iterations: 15, maxDepth: 3, seed: 123 });

    expect(result.action).not.toBeNull();
    expect(result.iterations).toBe(15);
  });

  it('demonstrates that changing explorationConstant changes search behavior in controlled fixture', () => {
    class AsymmetricFixtureEvaluator implements SearchEvaluator<DummyState> {
      evaluate<A>(_game: SearchGame<DummyState, A>, state: DummyState, _isTerminal: boolean): SearchUtility {
        const rewardMap: Record<string, number> = { a: 0.9, b: 0.5, c: 0.1 };
        const val = state.lastAction ? (rewardMap[state.lastAction] ?? 0.5) : 0.5;
        return { 'p0': val, 'p1': 1 - val };
      }
    }

    const engineLowC = new MctsEngine<DummyState, DummyAction>({
      evaluator: new AsymmetricFixtureEvaluator(),
      selectionPolicy: new UctSelectionPolicy({ explorationConstant: 0.01 }),
    });

    const engineHighC = new MctsEngine<DummyState, DummyAction>({
      evaluator: new AsymmetricFixtureEvaluator(),
      selectionPolicy: new UctSelectionPolicy({ explorationConstant: 5.0 }),
    });

    const rootState: DummyState = { player: 'p0', players: ['p0', 'p1'] };

    const resultLowC = engineLowC.search(game, rootState, { iterations: 60, maxDepth: 2, seed: 42 });
    const resultHighC = engineHighC.search(game, rootState, { iterations: 60, maxDepth: 2, seed: 42 });

    const lowCVisits = resultLowC.candidates.map((c) => c.visits);
    const highCVisits = resultHighC.candidates.map((c) => c.visits);

    // Low C focuses heavily on action 'a' (highest exploitation)
    // High C spreads visits much more evenly across all options
    expect(lowCVisits).not.toEqual(highCVisits);
    expect(lowCVisits[0]).toBeGreaterThan(highCVisits[0]);
  });

  it('allows specifying explorationConstant through SearchConfig in engine search call', () => {
    class AsymmetricFixtureEvaluator implements SearchEvaluator<DummyState> {
      evaluate<A>(_game: SearchGame<DummyState, A>, state: DummyState, _isTerminal: boolean): SearchUtility {
        const rewardMap: Record<string, number> = { a: 0.9, b: 0.5, c: 0.1 };
        const val = state.lastAction ? (rewardMap[state.lastAction] ?? 0.5) : 0.5;
        return { 'p0': val, 'p1': 1 - val };
      }
    }

    const engine = new MctsEngine<DummyState, DummyAction>({
      evaluator: new AsymmetricFixtureEvaluator(),
    });

    const rootState: DummyState = { player: 'p0', players: ['p0', 'p1'] };

    const res1 = engine.search(game, rootState, { iterations: 60, maxDepth: 2, seed: 99, explorationConstant: 0.01 });
    const res2 = engine.search(game, rootState, { iterations: 60, maxDepth: 2, seed: 99, explorationConstant: 5.0 });

    expect(res1.candidates.map((c) => c.visits)).not.toEqual(res2.candidates.map((c) => c.visits));
  });
});
