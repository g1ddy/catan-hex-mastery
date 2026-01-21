import { Hex, BoardStats, TERRAIN_CONFIG, GameState } from '../types';
import { PIP_MAP } from '../config';
import { getHexesForVertex } from '../hexUtils';
import { safeGet } from '../../utils/objectUtils';

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

export function calculatePlayerPotentialPips(G: GameState): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};

    Object.values(G.players).forEach(player => {
        const playerPips: Record<string, number> = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

        Object.entries(G.board.vertices).forEach(([vId, vertex]) => {
            if (vertex.owner === player.id) {
                const multiplier = vertex.type === 'city' ? 2 : 1;
                const adjacentHexIds = getHexesForVertex(vId);

                adjacentHexIds.forEach(hexId => {
                    const hex = safeGet(G.board.hexes, hexId);

                    if (hex && hex.tokenValue && hex.terrain) {
                        const resource = TERRAIN_CONFIG[hex.terrain];
                        if (resource) {
                            const pips = (PIP_MAP[hex.tokenValue] || 0) * multiplier;
                            playerPips[resource] = (playerPips[resource] || 0) + pips;
                        }
                    }
                });
            }
        });

        result[player.id] = playerPips;
    });

    return result;
}
