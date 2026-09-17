import type { SearchGame } from '../search/SearchGame';
import type { RolloutPolicy } from '../search/MctsPolicies';
import type { SearchRandom } from '../search/SearchRandom';
import { SeededSearchRandom } from '../search/SearchRandom';
import type { CatanSearchState } from './CatanSearchState';
import type { CatanSearchAction } from './CatanSearchAction';
import { CatanEvaluator } from './CatanEvaluator';

export interface CatanRolloutPolicyOptions {
  evaluator?: CatanEvaluator;
  evalWeight?: number;
  customWeights?: Partial<Record<string, number>>;
}

const DEFAULT_ACTION_BASE_WEIGHTS: Record<string, number> = {
  placeSettlement: 10.0,
  buildSettlement: 10.0,
  buildCity: 12.0,
  placeRoad: 3.0,
  buildRoad: 3.0,
  rollDice: 15.0,
  resolveRoll: 15.0,
  dismissRobber: 6.0,
  tradeBank: 2.0,
  endTurn: 1.0,
  regenerateBoard: 0.1,
};

/**
 * One-step heuristic rollout policy implementing RolloutPolicy<CatanSearchState, CatanSearchAction>.
 *
 * Evaluation & Action Selection Strategy:
 * 1. Action-type priors (`baseWeights`) provide baseline move-type preferences.
 * 2. 1-step post-action evaluator lookahead (`CatanEvaluator.evaluate(nextState)`) provides an optional
 *    strategic score bonus for candidate actions applied via `CatanSearchGame.applyAction()`.
 * 3. Candidate lookahead transitions use local stateless `SeededSearchRandom` instances to intentionally
 *    insulate the search's injected RNG stream from candidate evaluation loops.
 * 4. Weighted random sampling via injected `SearchRandom.next()` selects the actual rollout action.
 */
export class CatanRolloutPolicy implements RolloutPolicy<CatanSearchState, CatanSearchAction> {
  private readonly evaluator: CatanEvaluator;
  private readonly evalWeight: number;
  private readonly baseWeights: Readonly<Record<string, number>>;

  constructor(options: CatanRolloutPolicyOptions = {}) {
    this.evaluator = options.evaluator ?? new CatanEvaluator();
    this.evalWeight = options.evalWeight ?? 10.0;

    const weights: Record<string, number> = { ...DEFAULT_ACTION_BASE_WEIGHTS };
    if (options.customWeights) {
      for (const [key, val] of Object.entries(options.customWeights)) {
        if (val !== undefined) {
          weights[key] = val;
        }
      }
    }
    this.baseWeights = weights;
  }

  public selectAction(
    game: SearchGame<CatanSearchState, CatanSearchAction>,
    state: CatanSearchState,
    random: SearchRandom
  ): CatanSearchAction | null {
    if (game.isTerminal(state)) {
      return null;
    }

    const legalActions = game.getLegalActions(state);
    if (legalActions.length === 0) {
      return null;
    }

    if (legalActions.length === 1) {
      return legalActions[0];
    }

    const actingPlayer = game.getCurrentPlayer(state);
    const weights: number[] = new Array(legalActions.length);
    let totalWeight = 0.0;

    for (let i = 0; i < legalActions.length; i++) {
      const action = legalActions[i];
      const baseWeight = this.baseWeights[action.move] ?? 1.0;

      let evalBonus = 0.0;
      if (this.evalWeight > 0) {
        // Instantiate a local stateless RNG per candidate lookahead to ensure
        // zero cross-call contamination and zero consumption of caller's main SearchRandom stream.
        const evalRng = new SeededSearchRandom(i * 10007);
        const nextState = game.applyAction(state, action, evalRng);
        const evalUtility = this.evaluator.evaluate(game, nextState, game.isTerminal(nextState));
        const playerUtility = evalUtility[actingPlayer] ?? 0.0;
        evalBonus = playerUtility * this.evalWeight;
      }

      const validWeight = Math.max(0.01, baseWeight + evalBonus);
      weights[i] = validWeight;
      totalWeight += validWeight;
    }

    // Perform weighted random sampling using injected SearchRandom
    const threshold = random.next() * totalWeight;
    let accumulated = 0.0;

    for (let i = 0; i < legalActions.length; i++) {
      accumulated += weights[i];
      if (accumulated >= threshold) {
        return legalActions[i];
      }
    }

    return legalActions[legalActions.length - 1];
  }
}
