import type { SearchGame } from '../search/SearchGame';
import type { SearchEvaluator, SearchUtility } from '../search/MctsPolicies';
import type { CatanSearchState } from './CatanSearchState';
import { calculatePlayerPotentialPips } from '../../analysis/analyst';
import { isValidPlayer } from '../../core/validation';
import { safeGet } from '../../core/utils/objectUtils';
import { getValidSetupSettlementSpots } from '../../rules/queries';
import { isValidSettlementPlacement, validateSettlementLocation } from '../../rules/spatial';

export interface CatanEvaluatorWeights {
  victoryPoints: number;
  productionPips: number;
  resourceDiversity: number;
  synergyOreWheat: number;
  synergyWoodBrick: number;
  cities: number;
  settlements: number;
  roadLength: number;
  settlementSpots: number;
  ports: number;
}

export const DEFAULT_CATAN_EVALUATOR_WEIGHTS: Readonly<CatanEvaluatorWeights> = Object.freeze({
  victoryPoints: 10.0,
  productionPips: 1.0,
  resourceDiversity: 3.0,
  synergyOreWheat: 4.0,
  synergyWoodBrick: 3.0,
  cities: 4.0,
  settlements: 2.0,
  roadLength: 0.5,
  settlementSpots: 1.0,
  ports: 2.0,
});

export class CatanEvaluator implements SearchEvaluator<CatanSearchState> {
  private readonly weights: CatanEvaluatorWeights;

  constructor(weights: Partial<CatanEvaluatorWeights> = {}) {
    this.weights = { ...DEFAULT_CATAN_EVALUATOR_WEIGHTS, ...weights };
  }

  public evaluate<A>(
    game: SearchGame<CatanSearchState, A>,
    state: CatanSearchState,
    isTerminal: boolean
  ): SearchUtility {
    const players = game.getPlayers(state);
    const utility: Record<string, number> = Object.create(null);

    if (isTerminal) {
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

    // Calculate raw strategic scores for each player
    const pipsByPlayer = calculatePlayerPotentialPips(state.game);

    for (const playerID of players) {
      if (!isValidPlayer(playerID, state.game)) {
        utility[playerID] = 0.0;
        continue;
      }

      const player = state.game.players[playerID];
      if (!player) {
        utility[playerID] = 0.0;
        continue;
      }

      let rawScore = 0.0;

      // 1. Victory Points & progress
      rawScore += player.victoryPoints * this.weights.victoryPoints;

      // 2. Resource production pips
      const myPips = pipsByPlayer[playerID] || {};
      const totalPips = Object.values(myPips).reduce((sum, p) => sum + p, 0);
      rawScore += totalPips * this.weights.productionPips;

      // 3. Resource diversity
      const activeResources = Object.values(myPips).filter((p) => p > 0).length;
      if (activeResources >= 4) {
        rawScore += this.weights.resourceDiversity;
      } else if (activeResources === 3) {
        rawScore += this.weights.resourceDiversity * 0.5;
      }

      // 4. Resource synergies (Ore/Wheat, Wood/Brick)
      if ((myPips.ore || 0) > 0 && (myPips.wheat || 0) > 0) {
        rawScore += this.weights.synergyOreWheat;
      }
      if ((myPips.wood || 0) > 0 && (myPips.brick || 0) > 0) {
        rawScore += this.weights.synergyWoodBrick;
      }

      // 5. Cities and Settlements
      let cityCount = 0;
      let settlementCount = 0;
      for (const vId of player.settlements) {
        const v = safeGet(state.game.board.vertices, vId);
        if (v?.type === 'city') {
          cityCount++;
        } else if (v?.type === 'settlement') {
          settlementCount++;
        }
      }
      rawScore += cityCount * this.weights.cities + settlementCount * this.weights.settlements;

      // 6. Road length & expansion potential
      rawScore += player.roads.length * this.weights.roadLength;

      // 7. Settlement opportunities for player
      if (state.context.phase === 'setup') {
        const spots = getValidSetupSettlementSpots(state.game);
        let validPlayerSpots = 0;
        for (const spot of spots) {
          if (validateSettlementLocation(state.game, spot).isValid) {
            validPlayerSpots++;
          }
        }
        rawScore += validPlayerSpots * this.weights.settlementSpots;
      } else {
        // Count open settlement spots reachable by player's roads
        let openSpots = 0;
        for (const vId of Object.keys(state.game.board.vertices)) {
          if (isValidSettlementPlacement(state.game, vId, playerID).isValid) {
            openSpots++;
          }
        }
        rawScore += openSpots * this.weights.settlementSpots;
      }

      // 8. Port access
      let portCount = 0;
      const portsList = Object.values(state.game.board.ports || {});
      for (const port of portsList) {
        if (port.vertices.some((vId) => player.settlements.includes(vId))) {
          portCount++;
        }
      }
      rawScore += portCount * this.weights.ports;

      // Smooth, non-saturating monotonic scaling: rawScore / (rawScore + 40) * 0.98
      // Monotonically strictly increasing, bounded strictly in [0.01, 0.98]
      const nonTerminalVal = (rawScore / (rawScore + 40.0)) * 0.98;
      const normalized = Math.min(0.98, Math.max(0.01, nonTerminalVal));
      utility[playerID] = Math.round(normalized * 10000) / 10000;
    }

    return utility;
  }
}
