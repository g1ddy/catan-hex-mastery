import type { SearchGame } from '../search/SearchGame';
import type { SearchEvaluator, SearchUtility } from '../search/MctsPolicies';
import type { CatanSearchState } from './CatanSearchState';
import { calculatePlayerPotentialPips } from '../../analysis/analyst';
import { isValidPlayer } from '../../core/validation';
import { safeGet } from '../../core/utils/objectUtils';
import { getValidSetupSettlementSpots, getValidSettlementSpots } from '../../rules/queries';

export interface CatanEvaluatorWeights {
  /** Weight for player's current victory points */
  victoryPoints: number;
  /** Weight for total expected resource production pips */
  productionPips: number;
  /** Weight for resource diversity across the 5 resource types */
  resourceDiversity: number;
  /** Weight for having both Ore and Wheat production */
  synergyOreWheat: number;
  /** Weight for having both Wood and Brick production */
  synergyWoodBrick: number;
  /** Weight for cities owned */
  cities: number;
  /** Weight for settlements owned */
  settlements: number;
  /** Weight for road count */
  roadLength: number;
  /** Weight for open settlement placement opportunities */
  settlementSpots: number;
  /** Weight for port access */
  ports: number;
  /** Weight for relative production / competitive position relative to top opponent */
  opponentPressure: number;
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
  opponentPressure: 1.0,
});

/**
 * Validates that all evaluator weights are non-negative finite numbers.
 * Evaluator weights represent non-negative strategic importances.
 */
export function validateEvaluatorWeights(weights: Record<string, number>): void {
  for (const [key, val] of Object.entries(weights)) {
    if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val) || val < 0) {
      throw new Error(`Invalid evaluator weight '${key}': ${val}. Weights must be non-negative finite numbers.`);
    }
  }
}

// Extracted Signal Evaluation Functions

export function evaluateVictoryPoints(state: CatanSearchState, playerID: string): number {
  const player = state.game.players[playerID];
  return player?.victoryPoints ?? 0;
}

export function evaluateProductionPips(
  myPips: Record<string, number>
): number {
  return Object.values(myPips).reduce((sum, p) => sum + p, 0);
}

/**
 * Coarse v1 heuristic measuring resource diversity using a 3/4 threshold.
 * Note: This is a simplified coarse heuristic rather than a full continuous entropy calculation.
 */
export function evaluateResourceDiversity(myPips: Record<string, number>): number {
  const activeCount = Object.values(myPips).filter((p) => p > 0).length;
  if (activeCount >= 4) return 1.0;
  if (activeCount === 3) return 0.5;
  return 0.0;
}

/**
 * Coarse v1 heuristic measuring binary presence of key resource pairings (Ore/Wheat and Wood/Brick).
 * Note: This is a binary presence indicator rather than a complex economic synergy solver.
 */
export function evaluateResourceSynergy(myPips: Record<string, number>): { oreWheat: number; woodBrick: number } {
  const oreWheat = (myPips.ore || 0) > 0 && (myPips.wheat || 0) > 0 ? 1.0 : 0.0;
  const woodBrick = (myPips.wood || 0) > 0 && (myPips.brick || 0) > 0 ? 1.0 : 0.0;
  return { oreWheat, woodBrick };
}

export function evaluateStructures(state: CatanSearchState, playerID: string): { cityCount: number; settlementCount: number } {
  const player = state.game.players[playerID];
  if (!player) return { cityCount: 0, settlementCount: 0 };

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
  return { cityCount, settlementCount };
}

/**
 * Coarse v1 heuristic measuring raw road count.
 * Note: This counts total roads built rather than calculating topological network connectivity or longest contiguous road path.
 */
export function evaluateRoadExpansion(state: CatanSearchState, playerID: string): number {
  const player = state.game.players[playerID];
  return player?.roads.length ?? 0;
}

export function evaluateSettlementOpportunities(state: CatanSearchState, playerID: string): number {
  if (state.context.phase === 'setup') {
    if (state.context.currentPlayer === playerID) {
      const spots = getValidSetupSettlementSpots(state.game);
      return spots.size;
    }
    return 0;
  }

  const spots = getValidSettlementSpots(state.game, playerID, false);
  return spots.size;
}

export function evaluatePortAccess(state: CatanSearchState, playerID: string): number {
  const player = state.game.players[playerID];
  if (!player) return 0;

  let portCount = 0;
  const portsList = Object.values(state.game.board.ports || {});
  for (const port of portsList) {
    if (port.vertices.some((vId) => player.settlements.includes(vId))) {
      portCount++;
    }
  }
  return portCount;
}

/**
 * Evaluates relative production pips differential compared to the top opponent.
 * Rewards leading the board in production and penalizes trailing top opponents.
 */
export function evaluateOpponentPressure(
  playerID: string,
  players: readonly string[],
  pipsByPlayer: Record<string, Record<string, number>>
): number {
  const myPipsTotal = evaluateProductionPips(pipsByPlayer[playerID] || {});
  let maxOpponentPips = 0;

  for (const oppID of players) {
    if (oppID !== playerID) {
      const oppPipsTotal = evaluateProductionPips(pipsByPlayer[oppID] || {});
      if (oppPipsTotal > maxOpponentPips) {
        maxOpponentPips = oppPipsTotal;
      }
    }
  }

  return Math.max(-10.0, Math.min(10.0, myPipsTotal - maxOpponentPips));
}

/**
 * Catan state evaluator implementing SearchEvaluator<CatanSearchState>.
 *
 * Non-terminal state utilities are independent per-player, general-sum strategic value estimates
 * bounded strictly in [0.01, 0.98] via logistic sigmoid normalization:
 * `0.01 + 0.97 / (1 + Math.exp(-rawScore / 40.0))`.
 * This transformation is strictly monotonic, deterministic, and mathematically safe for all real raw scores,
 * eliminating division-by-zero, negative values, NaN, or Infinity under any valid non-negative weights.
 * Utilities reflect each player's absolute and relative game progress independently, rather than
 * enforcing a zero-sum constraint across players. Genuine winning terminal outcomes (1.0) strictly dominate
 * all non-terminal state estimates.
 */
export class CatanEvaluator implements SearchEvaluator<CatanSearchState> {
  private readonly weights: CatanEvaluatorWeights;

  constructor(weights: Partial<CatanEvaluatorWeights> = {}) {
    const combined = { ...DEFAULT_CATAN_EVALUATOR_WEIGHTS, ...weights };
    validateEvaluatorWeights(combined);
    this.weights = combined;
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

      const myPips = pipsByPlayer[playerID] || {};

      // Calculate signals using extracted functions
      const vp = evaluateVictoryPoints(state, playerID);
      const pips = evaluateProductionPips(myPips);
      const diversity = evaluateResourceDiversity(myPips);
      const synergy = evaluateResourceSynergy(myPips);
      const { cityCount, settlementCount } = evaluateStructures(state, playerID);
      const roads = evaluateRoadExpansion(state, playerID);
      const settlementSpots = evaluateSettlementOpportunities(state, playerID);
      const ports = evaluatePortAccess(state, playerID);
      const oppPressure = evaluateOpponentPressure(playerID, players, pipsByPlayer);

      let rawScore = 0.0;
      rawScore += vp * this.weights.victoryPoints;
      rawScore += pips * this.weights.productionPips;
      rawScore += diversity * this.weights.resourceDiversity;
      rawScore += synergy.oreWheat * this.weights.synergyOreWheat;
      rawScore += synergy.woodBrick * this.weights.synergyWoodBrick;
      rawScore += cityCount * this.weights.cities + settlementCount * this.weights.settlements;
      rawScore += roads * this.weights.roadLength;
      rawScore += settlementSpots * this.weights.settlementSpots;
      rawScore += ports * this.weights.ports;
      rawScore += oppPressure * this.weights.opponentPressure;

      // Mathematically safe logistic sigmoid mapping strictly bounded in [0.01, 0.98]
      const expVal = Math.exp(-rawScore / 40.0);
      const nonTerminalVal = 0.01 + 0.97 / (1.0 + expVal);
      const normalized = Math.min(0.98, Math.max(0.01, nonTerminalVal));
      utility[playerID] = Math.round(normalized * 10000) / 10000;
    }

    return utility;
  }
}
