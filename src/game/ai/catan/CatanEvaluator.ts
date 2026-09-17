import type { SearchGame } from '../search/SearchGame';
import type { SearchEvaluator, SearchUtility } from '../search/MctsPolicies';
import type { CatanSearchState } from './CatanSearchState';
import { calculatePlayerPotentialPips } from '../../mechanics/production';
import { isValidPlayer } from '../../core/validation';
import { safeGet } from '../../core/utils/objectUtils';
import { getValidSetupSettlementSpots, getValidSettlementSpots } from '../../rules/queries';

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
  /** Production advantage/disadvantage versus the highest-producing opponent; not spatial blocking pressure. */
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

export function validateEvaluatorWeights(weights: Record<string, number>): void {
  for (const [key, val] of Object.entries(weights)) {
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
      throw new Error(`Invalid evaluator weight '${key}': ${val}. Weights must be non-negative finite numbers.`);
    }
  }
}

export function evaluateVictoryPoints(state: CatanSearchState, playerID: string): number {
  return state.game.players[playerID]?.victoryPoints ?? 0;
}

export function evaluateProductionPips(myPips: Record<string, number>): number {
  return Object.values(myPips).reduce((sum, p) => sum + p, 0);
}

export function evaluateResourceDiversity(myPips: Record<string, number>): number {
  const activeCount = Object.values(myPips).filter((p) => p > 0).length;
  if (activeCount >= 4) return 1.0;
  if (activeCount === 3) return 0.5;
  return 0.0;
}

export function evaluateResourceSynergy(myPips: Record<string, number>): { oreWheat: number; woodBrick: number } {
  return {
    oreWheat: (myPips.ore || 0) > 0 && (myPips.wheat || 0) > 0 ? 1.0 : 0.0,
    woodBrick: (myPips.wood || 0) > 0 && (myPips.brick || 0) > 0 ? 1.0 : 0.0,
  };
}

export function evaluateStructures(state: CatanSearchState, playerID: string): { cityCount: number; settlementCount: number } {
  const player = state.game.players[playerID];
  if (!player) return { cityCount: 0, settlementCount: 0 };

  let cityCount = 0;
  let settlementCount = 0;
  for (const vId of player.settlements) {
    const v = safeGet(state.game.board.vertices, vId);
    if (v?.type === 'city') cityCount++;
    else if (v?.type === 'settlement') settlementCount++;
  }
  return { cityCount, settlementCount };
}

export function evaluateRoadExpansion(state: CatanSearchState, playerID: string): number {
  return state.game.players[playerID]?.roads.length ?? 0;
}

export function evaluateSettlementOpportunities(state: CatanSearchState, playerID: string): number {
  if (state.context.phase === 'setup') {
    if (state.context.currentPlayer !== playerID) return 0;
    return getValidSetupSettlementSpots(state.game).size;
  }
  return getValidSettlementSpots(state.game, playerID, false).size;
}

export function evaluatePortAccess(state: CatanSearchState, playerID: string): number {
  const player = state.game.players[playerID];
  if (!player) return 0;
  return Object.values(state.game.board.ports || {}).filter((port) =>
    port.vertices.some((vId) => player.settlements.includes(vId))
  ).length;
}

/** Relative production advantage versus the strongest opponent, used as a competitive proxy. */
export function evaluateOpponentPressure(
  playerID: string,
  players: readonly string[],
  pipsByPlayer: Record<string, Record<string, number>>
): number {
  const myPipsTotal = evaluateProductionPips(pipsByPlayer[playerID] || {});
  let maxOpponentPips = 0;
  for (const oppID of players) {
    if (oppID === playerID) continue;
    maxOpponentPips = Math.max(maxOpponentPips, evaluateProductionPips(pipsByPlayer[oppID] || {}));
  }
  return Math.max(-10.0, Math.min(10.0, myPipsTotal - maxOpponentPips));
}

/**
 * Catan state evaluator. Non-terminal values are independent per-player estimates bounded to [0.01, 0.98].
 * Opponent pressure is intentionally limited to production differential; spatial blocking belongs to later
 * Catan-owned analysis primitives rather than being inferred here.
 */
export class CatanEvaluator implements SearchEvaluator<CatanSearchState> {
  private readonly weights: CatanEvaluatorWeights;

  constructor(weights: Partial<CatanEvaluatorWeights> = {}) {
    const combined = { ...DEFAULT_CATAN_EVALUATOR_WEIGHTS, ...weights };
    validateEvaluatorWeights(combined);
    this.weights = combined;
  }

  public evaluate<A>(game: SearchGame<CatanSearchState, A>, state: CatanSearchState, isTerminal: boolean): SearchUtility {
    const players = game.getPlayers(state);
    const utility: Record<string, number> = Object.create(null);

    if (isTerminal) {
      const term = game.getTerminalResult(state);
      if (term?.kind === 'winner') {
        for (const p of players) utility[p] = p === term.winnerId ? 1.0 : 0.0;
      } else {
        for (const p of players) utility[p] = 0.5;
      }
      return utility;
    }

    const pipsByPlayer = calculatePlayerPotentialPips(state.game);
    for (const playerID of players) {
      if (!isValidPlayer(playerID, state.game) || !state.game.players[playerID]) {
        utility[playerID] = 0.0;
        continue;
      }

      const myPips = pipsByPlayer[playerID] || {};
      const vp = evaluateVictoryPoints(state, playerID);
      const pips = evaluateProductionPips(myPips);
      const diversity = evaluateResourceDiversity(myPips);
      const synergy = evaluateResourceSynergy(myPips);
      const { cityCount, settlementCount } = evaluateStructures(state, playerID);
      const roads = evaluateRoadExpansion(state, playerID);
      const settlementSpots = evaluateSettlementOpportunities(state, playerID);
      const ports = evaluatePortAccess(state, playerID);
      const opponentPressure = evaluateOpponentPressure(playerID, players, pipsByPlayer);

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
      rawScore += opponentPressure * this.weights.opponentPressure;

      const expVal = Math.exp(-rawScore / 40.0);
      const normalized = Math.min(0.98, Math.max(0.01, 0.01 + 0.97 / (1.0 + expVal)));
      utility[playerID] = Math.round(normalized * 10000) / 10000;
    }
    return utility;
  }
}
