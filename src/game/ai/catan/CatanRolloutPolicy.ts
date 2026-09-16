import type { SearchGame } from '../search/SearchGame';
import type { RolloutPolicy } from '../search/MctsPolicies';
import type { SearchRandom } from '../search/SearchRandom';
import type { CatanSearchState } from './CatanSearchState';
import type { CatanSearchAction } from './CatanSearchAction';

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

export class CatanRolloutPolicy implements RolloutPolicy<CatanSearchState, CatanSearchAction> {
  private readonly baseWeights: Readonly<Record<string, number>>;

  constructor(customWeights?: Partial<Record<string, number>>) {
    const weights: Record<string, number> = { ...DEFAULT_ACTION_BASE_WEIGHTS };
    if (customWeights) {
      for (const [key, val] of Object.entries(customWeights)) {
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

    const weights: number[] = new Array(legalActions.length);
    let totalWeight = 0.0;

    for (let i = 0; i < legalActions.length; i++) {
      const action = legalActions[i];
      let weight = this.baseWeights[action.move] ?? 1.0;

      // Small heuristic adjustments based on action payload without state simulation
      if (action.move === 'placeSettlement' || action.move === 'buildSettlement') {
        weight += 5.0;
      } else if (action.move === 'buildCity') {
        weight += 8.0;
      }

      const validWeight = Math.max(0.01, weight);
      weights[i] = validWeight;
      totalWeight += validWeight;
    }

    // Weighted random sampling using injected SearchRandom
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
