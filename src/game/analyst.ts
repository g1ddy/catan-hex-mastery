import { Hex, BoardStats } from './types';
import { calculatePipCount, SCARCITY_THRESHOLD } from './analysis/pips';

const ABUNDANCE_THRESHOLD = 0.30;
const SCARCITY_PENALTY = 20;
const ABUNDANCE_PENALTY = 10;

export function calculateBoardStats(hexes: Record<string, Hex>): BoardStats {
  const { totalPips, totalBoardPips } = calculatePipCount(hexes);

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
