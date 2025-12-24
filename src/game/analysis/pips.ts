import { Hex, TerrainType, TERRAIN_CONFIG } from '../types';

export const PIP_MAP: Record<number, number> = {
  2: 1, 12: 1,
  3: 2, 11: 2,
  4: 3, 10: 3,
  5: 4, 9: 4,
  6: 5, 8: 5,
  7: 0
};

export type ResourcePips = Record<string, number>;

export const INITIAL_RESOURCE_PIPS: ResourcePips = {
  wood: 0,
  brick: 0,
  sheep: 0,
  wheat: 0,
  ore: 0
};

export function calculatePipCount(hexes: Record<string, Hex>): { totalPips: ResourcePips, totalBoardPips: number } {
  const totalPips: ResourcePips = { ...INITIAL_RESOURCE_PIPS };
  let totalBoardPips = 0;

  Object.values(hexes).forEach(hex => {
    const resource = TERRAIN_CONFIG[hex.terrain];
    if (resource && hex.tokenValue) {
      const pips = PIP_MAP[hex.tokenValue] || 0;
      totalPips[resource] += pips;
      totalBoardPips += pips;
    }
  });

  return { totalPips, totalBoardPips };
}

export function getScarcityMap(totalPips: ResourcePips, totalBoardPips: number): Record<string, boolean> {
  const scarcityMap: Record<string, boolean> = {};
  const SCARCITY_THRESHOLD = 0.10;

  if (totalBoardPips === 0) return scarcityMap;

  Object.entries(totalPips).forEach(([resource, pips]) => {
    if (pips / totalBoardPips < SCARCITY_THRESHOLD) {
      scarcityMap[resource] = true;
    }
  });

  return scarcityMap;
}
