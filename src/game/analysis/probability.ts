import { PIP_MAP, TERRAIN_CONFIG } from '../core/config';
import type { GameState, Hex, Resources } from '../core/types';
import { getHexesForVertex } from '../geometry/hexUtils';
import { safeGet } from '../core/utils/objectUtils';

export interface RollStats {
  roll: number;
  combinations: number;
  probability: number;
  pipWeight: number;
}

const COMBINATIONS_2D6: Record<number, number> = {
  2: 1, 12: 1,
  3: 2, 11: 2,
  4: 3, 10: 3,
  5: 4, 9: 4,
  6: 5, 8: 5,
  7: 6,
};

/**
 * Returns exact 2d6 combinations, probability, and pip weight for a given roll sum (2..12).
 */
export function get2d6RollStats(roll: number): RollStats {
  const combinations = COMBINATIONS_2D6[roll] ?? 0;
  const probability = combinations / 36;
  const pipWeight = PIP_MAP[roll] ?? 0;
  return {
    roll,
    combinations,
    probability,
    pipWeight,
  };
}

/** Returns exact probability of rolling `roll` on 2d6 (combinations / 36). */
export function get2d6Probability(roll: number): number {
  return (COMBINATIONS_2D6[roll] ?? 0) / 36;
}

/** Returns 2d6 combinations count (1..6) for `roll`. */
export function get2d6Combinations(roll: number): number {
  return COMBINATIONS_2D6[roll] ?? 0;
}

/** Returns pip weight for `roll` (5 for 6/8 down to 1 for 2/12, 0 for 7 or invalid). */
export function get2d6PipWeight(roll: number): number {
  return PIP_MAP[roll] ?? 0;
}

/**
 * Expected production probability yield per dice roll for a single hex.
 * Returns 0 if desert, sea, or missing token value.
 */
export function getHexExpectedProduction(hex: Hex | null | undefined): number {
  if (!hex || !hex.tokenValue || !hex.terrain) return 0;
  const resource = TERRAIN_CONFIG[hex.terrain];
  if (!resource) return 0;
  return get2d6Probability(hex.tokenValue);
}

export interface ExpectedProductionOptions {
  /** Override structure type multiplier (settlement = 1, city = 2). Default uses vertex structure if present or settlement (1x) if unbuilt. */
  structureType?: 'settlement' | 'city';
  /** If true, returns 0 if robber is on hex. Defaults to false. */
  checkRobber?: boolean;
}

/**
 * Expected resource yield per dice roll for a vertex location.
 * Applies 1x for settlement and 2x for city multiplier.
 */
export function getVertexExpectedProduction(
  G: GameState,
  vertexId: string,
  options: ExpectedProductionOptions = {}
): number {
  const hexes = getHexesForVertex(vertexId);
  const vertex = safeGet(G.board.vertices, vertexId);

  let multiplier = 1;
  if (options.structureType) {
    multiplier = options.structureType === 'city' ? 2 : 1;
  } else if (vertex) {
    multiplier = vertex.type === 'city' ? 2 : 1;
  }

  let totalProb = 0;
  for (const hexId of hexes) {
    const hex = safeGet(G.board.hexes, hexId);
    if (!hex || !hex.tokenValue || !hex.terrain) continue;
    if (options.checkRobber && G.robberLocation === hexId) continue;
    const resource = TERRAIN_CONFIG[hex.terrain];
    if (!resource) continue;
    totalProb += get2d6Probability(hex.tokenValue);
  }

  return totalProb * multiplier;
}

export interface PlayerProductionSummary {
  byResource: Record<keyof Resources, number>;
  totalExpectedProduction: number;
  totalPips: number;
}

/**
 * Calculates resource-level expected production (yield per dice roll) and total pips for a player.
 */
export function getPlayerExpectedProduction(
  G: GameState,
  playerID: string,
  options: { checkRobber?: boolean } = {}
): PlayerProductionSummary {
  const byResource: Record<keyof Resources, number> = {
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0,
  };
  let totalPips = 0;

  const player = safeGet(G.players, playerID);
  if (!player) {
    return { byResource, totalExpectedProduction: 0, totalPips: 0 };
  }

  for (const vertexId of player.settlements) {
    const vertex = safeGet(G.board.vertices, vertexId);
    if (!vertex || vertex.owner !== playerID) continue;
    const multiplier = vertex.type === 'city' ? 2 : 1;

    for (const hexId of getHexesForVertex(vertexId)) {
      const hex = safeGet(G.board.hexes, hexId);
      if (!hex || !hex.tokenValue || !hex.terrain) continue;
      if (options.checkRobber && G.robberLocation === hexId) continue;
      const resource = TERRAIN_CONFIG[hex.terrain] as keyof Resources | null;
      if (!resource) continue;

      const prob = get2d6Probability(hex.tokenValue) * multiplier;
      const pips = get2d6PipWeight(hex.tokenValue) * multiplier;

      byResource[resource] = (byResource[resource] || 0) + prob;
      totalPips += pips;
    }
  }

  const totalExpectedProduction = Object.values(byResource).reduce((sum, v) => sum + v, 0);

  return {
    byResource,
    totalExpectedProduction,
    totalPips,
  };
}
