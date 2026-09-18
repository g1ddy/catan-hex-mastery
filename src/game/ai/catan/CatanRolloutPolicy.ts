import type { SearchGame } from '../search/SearchGame';
import type { RolloutPolicy } from '../search/MctsPolicies';
import type { SearchRandom } from '../search/SearchRandom';
import type { CatanSearchState } from './CatanSearchState';
import type { CatanSearchAction } from './CatanSearchAction';
import { CatanEvaluator } from './CatanEvaluator';

export interface CatanRolloutPolicyOptions { evaluator?: CatanEvaluator; evalWeight?: number; customWeights?: Partial<Record<string, number>>; }

/**
 * A configurable baseline rollout configuration for standard constructive preferences.
 * These weights are not objectively correct strategy policy, but provide a reasonable
 * starting point for Catan-aware rollouts.
 */
const DEFAULT_ACTION_BASE_WEIGHTS: Record<string, number> = { placeSettlement: 10, buildSettlement: 10, buildCity: 12, placeRoad: 3, buildRoad: 3, rollDice: 15, resolveRoll: 15, dismissRobber: 6, tradeBank: 2, endTurn: 1, regenerateBoard: 0.1 };

/**
 * Identifies actions known to have deterministic state transitions.
 *
 * Deterministic Catan move types (`placeSettlement`, `buildSettlement`, `buildCity`,
 * `placeRoad`, `buildRoad`, `rollDice`, `tradeBank`, `endTurn`) produce deterministic
 * successor states and may be evaluated using a throwing dummy RNG during candidate scoring.
 *
 * Stochastic move types (`resolveRoll`, `dismissRobber`, `regenerateBoard`) involve random die
 * rolls or card/board shuffles. They must NOT be executed during candidate scoring in rollout
 * action selection to avoid consuming RNG for unselected candidate actions.
 * Note: `rollDice` merely transitions `rollStatus` to `ROLLING` without rolling dice; the actual
 * stochastic roll occurs in `resolveRoll`.
 */
export function canEvaluateDeterministicSuccessor(action: CatanSearchAction): boolean {
  switch (action.move) {
    case 'placeSettlement':
    case 'buildSettlement':
    case 'buildCity':
    case 'placeRoad':
    case 'buildRoad':
    case 'rollDice':
    case 'tradeBank':
    case 'endTurn':
      return true;
    case 'resolveRoll':
    case 'dismissRobber':
    case 'regenerateBoard':
      return false;
  }
}

const DUMMY_RNG: SearchRandom = {
  next: () => { throw new Error('Deterministic candidate evaluation must not consume randomness.'); },
  integer: () => { throw new Error('Deterministic candidate evaluation must not consume randomness.'); },
  pick: () => { throw new Error('Deterministic candidate evaluation must not consume randomness.'); },
  die: () => { throw new Error('Deterministic candidate evaluation must not consume randomness.'); },
};

export function validateRolloutWeights(evalWeight: number, customWeights?: Partial<Record<string, number>>): void {
  if (!Number.isFinite(evalWeight) || evalWeight < 0) {
    throw new Error(`Invalid evalWeight '${evalWeight}'. Weights must be non-negative finite numbers.`);
  }
  if (customWeights) {
    for (const [key, value] of Object.entries(customWeights)) {
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        throw new Error(`Invalid custom weight '${key}': ${value}. Custom weights must be non-negative finite numbers.`);
      }
    }
  }
}

export class CatanRolloutPolicy implements RolloutPolicy<CatanSearchState, CatanSearchAction> {
  private readonly evaluator: CatanEvaluator; private readonly evalWeight: number; private readonly baseWeights: Readonly<Record<string, number>>;
  constructor(options: CatanRolloutPolicyOptions = {}) {
    const evalWeight = options.evalWeight ?? 10;
    validateRolloutWeights(evalWeight, options.customWeights);
    this.evaluator = options.evaluator ?? new CatanEvaluator();
    this.evalWeight = evalWeight;
    this.baseWeights = { ...DEFAULT_ACTION_BASE_WEIGHTS, ...(options.customWeights as Record<string, number> ?? {}) };
  }
  public selectAction(game: SearchGame<CatanSearchState, CatanSearchAction>, state: CatanSearchState, random: SearchRandom): CatanSearchAction | null {
    if (game.isTerminal(state)) return null; const legalActions = game.getLegalActions(state); if (legalActions.length === 0) return null; if (legalActions.length === 1) return legalActions[0];
    const actingPlayer = game.getCurrentPlayer(state); const weights: number[] = new Array(legalActions.length); let totalWeight = 0;
    for (let i = 0; i < legalActions.length; i++) {
      const action = legalActions[i]; const baseWeight = this.baseWeights[action.move] ?? 1; let evalBonus = 0;
      if (this.evalWeight > 0 && canEvaluateDeterministicSuccessor(action)) {
        const nextState = game.applyAction(state, action, DUMMY_RNG);
        const utility = this.evaluator.evaluate(game, nextState, game.isTerminal(nextState)); evalBonus = (utility[actingPlayer] ?? 0) * this.evalWeight;
      }
      const weight = Math.max(0.01, baseWeight + evalBonus); weights[i] = weight; totalWeight += weight;
    }
    const threshold = random.next() * totalWeight; let accumulated = 0;
    for (let i = 0; i < legalActions.length; i++) { accumulated += weights[i]; if (accumulated >= threshold) return legalActions[i]; }
    return legalActions[legalActions.length - 1];
  }
}
