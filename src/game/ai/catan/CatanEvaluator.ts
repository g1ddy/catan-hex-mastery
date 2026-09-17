import type { SearchGame } from '../search/SearchGame';
import type { SearchEvaluator, SearchUtility } from '../search/MctsPolicies';
import type { CatanSearchState } from './CatanSearchState';
import { calculatePlayerPotentialPips } from '../../analysis/production';
import { getPlayerAccessedPorts } from '../../analysis/spatialAnalysis';
import { isValidPlayer } from '../../core/validation';
import { safeGet } from '../../core/utils/objectUtils';
import { getValidSetupSettlementSpots, getValidSettlementSpots } from '../../rules/queries';

export interface CatanEvaluatorWeights {
  victoryPoints: number; productionPips: number; resourceDiversity: number; synergyOreWheat: number;
  synergyWoodBrick: number; cities: number; settlements: number; roadLength: number;
  settlementSpots: number; ports: number; productionAdvantage: number;
  /** @deprecated Compatibility alias for productionAdvantage. */ opponentPressure?: number;
}

export const DEFAULT_CATAN_EVALUATOR_WEIGHTS: Readonly<CatanEvaluatorWeights> = Object.freeze({
  victoryPoints: 10, productionPips: 1, resourceDiversity: 3, synergyOreWheat: 4, synergyWoodBrick: 3,
  cities: 4, settlements: 2, roadLength: 0.5, settlementSpots: 1, ports: 2, productionAdvantage: 1,
});

export function validateEvaluatorWeights(weights: Record<string, number | undefined>): void {
  for (const [key, value] of Object.entries(weights)) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`Invalid evaluator weight '${key}': ${value}. Weights must be non-negative finite numbers.`);
    }
  }
}

export function evaluateVictoryPoints(state: CatanSearchState, playerID: string): number { return state.game.players[playerID]?.victoryPoints ?? 0; }
export function evaluateProductionPips(pips: Record<string, number>): number { return Object.values(pips).reduce((sum, value) => sum + value, 0); }
export function evaluateResourceDiversity(pips: Record<string, number>): number {
  const active = Object.values(pips).filter((value) => value > 0).length;
  return active >= 4 ? 1 : active === 3 ? 0.5 : 0;
}
export function evaluateResourceSynergy(pips: Record<string, number>): { oreWheat: number; woodBrick: number } {
  return { oreWheat: pips.ore > 0 && pips.wheat > 0 ? 1 : 0, woodBrick: pips.wood > 0 && pips.brick > 0 ? 1 : 0 };
}
export function evaluateStructures(state: CatanSearchState, playerID: string): { cityCount: number; settlementCount: number } {
  const player = state.game.players[playerID]; if (!player) return { cityCount: 0, settlementCount: 0 };
  let cityCount = 0, settlementCount = 0;
  for (const vertexId of player.settlements) { const vertex = safeGet(state.game.board.vertices, vertexId); if (vertex?.type === 'city') cityCount++; else if (vertex?.type === 'settlement') settlementCount++; }
  return { cityCount, settlementCount };
}
export function evaluateRoadExpansion(state: CatanSearchState, playerID: string): number { return state.game.players[playerID]?.roads.length ?? 0; }
export function evaluateSettlementOpportunities(state: CatanSearchState, playerID: string): number {
  if (state.context.phase === 'setup') return state.context.currentPlayer === playerID ? getValidSetupSettlementSpots(state.game).size : 0;
  return getValidSettlementSpots(state.game, playerID, false).size;
}
export function evaluatePortAccess(state: CatanSearchState, playerID: string): number {
  return getPlayerAccessedPorts(state.game, playerID).length;
}
/**
 * Production lead/deficit versus the highest-producing opponent.
 * Note: This is an opponent-relative production signal, NOT a spatial blocking model.
 * Actual spatial blocking is deferred until existing geometry/rule primitives support it appropriately.
 */
export function evaluateProductionAdvantage(playerID: string, players: readonly string[], pipsByPlayer: Record<string, Record<string, number>>): number {
  const mine = evaluateProductionPips(pipsByPlayer[playerID] || {}); let highestOpponent = 0;
  for (const opponent of players) if (opponent !== playerID) highestOpponent = Math.max(highestOpponent, evaluateProductionPips(pipsByPlayer[opponent] || {}));
  return Math.max(-10, Math.min(10, mine - highestOpponent));
}
/** @deprecated Use evaluateProductionAdvantage. */
export const evaluateOpponentPressure = evaluateProductionAdvantage;

export class CatanEvaluator implements SearchEvaluator<CatanSearchState> {
  private readonly weights: CatanEvaluatorWeights;
  constructor(weights: Partial<CatanEvaluatorWeights> = {}) {
    const normalized = { ...weights } as Partial<CatanEvaluatorWeights>;
    if (normalized.opponentPressure !== undefined && normalized.productionAdvantage === undefined) normalized.productionAdvantage = normalized.opponentPressure;
    const combined = { ...DEFAULT_CATAN_EVALUATOR_WEIGHTS, ...normalized }; validateEvaluatorWeights(combined); this.weights = combined;
  }
  public evaluate<A>(game: SearchGame<CatanSearchState, A>, state: CatanSearchState, isTerminal: boolean): SearchUtility {
    const players = game.getPlayers(state); const utility: Record<string, number> = Object.create(null);
    if (isTerminal) { const terminal = game.getTerminalResult(state); for (const player of players) utility[player] = terminal?.kind === 'winner' ? (terminal.winnerId === player ? 1 : 0) : 0.5; return utility; }
    const pipsByPlayer = calculatePlayerPotentialPips(state.game);
    for (const playerID of players) {
      if (!isValidPlayer(playerID, state.game) || !state.game.players[playerID]) { utility[playerID] = 0; continue; }
      const pips = pipsByPlayer[playerID] || {}; const synergy = evaluateResourceSynergy(pips); const structures = evaluateStructures(state, playerID);
      let raw = evaluateVictoryPoints(state, playerID) * this.weights.victoryPoints;
      raw += evaluateProductionPips(pips) * this.weights.productionPips + evaluateResourceDiversity(pips) * this.weights.resourceDiversity;
      raw += synergy.oreWheat * this.weights.synergyOreWheat + synergy.woodBrick * this.weights.synergyWoodBrick;
      raw += structures.cityCount * this.weights.cities + structures.settlementCount * this.weights.settlements;
      raw += evaluateRoadExpansion(state, playerID) * this.weights.roadLength + evaluateSettlementOpportunities(state, playerID) * this.weights.settlementSpots;
      raw += evaluatePortAccess(state, playerID) * this.weights.ports + evaluateProductionAdvantage(playerID, players, pipsByPlayer) * this.weights.productionAdvantage;
      const normalized = 0.01 + 0.97 / (1 + Math.exp(-raw / 40)); utility[playerID] = Math.round(Math.min(0.98, Math.max(0.01, normalized)) * 10000) / 10000;
    }
    return utility;
  }
}
