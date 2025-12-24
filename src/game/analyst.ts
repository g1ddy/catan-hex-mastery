import { Hex, BoardStats, TERRAIN_CONFIG } from './types';

const SCARCITY_THRESHOLD = 0.10;
const ABUNDANCE_THRESHOLD = 0.30;
const SCARCITY_PENALTY = 20;
const ABUNDANCE_PENALTY = 10;

export function calculateBoardStats(hexes: Record<string, Hex>): BoardStats {
  const totalPips: Record<string, number> = {
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0
  };

  const PIP_MAP: Record<number, number> = {
    2: 1, 12: 1,
    3: 2, 11: 2,
    4: 3, 10: 3,
    5: 4, 9: 4,
    6: 5, 8: 5,
    7: 0 // Should not be on a resource hex usually, but for completeness
  };

  let totalBoardPips = 0;

  Object.values(hexes).forEach(hex => {
    const resource = TERRAIN_CONFIG[hex.terrain];
    if (resource && hex.tokenValue) {
      const pips = PIP_MAP[hex.tokenValue] || 0;
      totalPips[resource] += pips;
      totalBoardPips += pips;
    }
  });

  const warnings: string[] = [];
  let fairnessScore = 100;

  // Analysis
  // Expected roughly equal distribution.
  // 5 resources. 100% / 5 = 20%.
  // Warning if < 10% or > 30%.

  if (totalBoardPips > 0) {
      Object.entries(totalPips).forEach(([resource, pips]) => {
          const percentage = pips / totalBoardPips;
          if (percentage < SCARCITY_THRESHOLD) {
              warnings.push(`${resource.charAt(0).toUpperCase() + resource.slice(1)} Scarcity detected (${Math.round(percentage * 100)}%)`);
              fairnessScore -= SCARCITY_PENALTY;
          } else if (percentage > ABUNDANCE_THRESHOLD) {
              warnings.push(`${resource.charAt(0).toUpperCase() + resource.slice(1)} Abundance detected (${Math.round(percentage * 100)}%)`);
              fairnessScore -= ABUNDANCE_PENALTY;
          }
      });
  } else {
      warnings.push("No pips detected on board.");
      fairnessScore = 0;
  }

  return {
    totalPips,
    fairnessScore: Math.max(0, fairnessScore),
    warnings
  };
}
