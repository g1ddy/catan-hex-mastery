import { TERRAIN_CONFIG, PIP_MAP } from '../core/config';
import type { GameState } from '../core/types';
import { getHexesForVertex } from '../geometry/hexUtils';
import { safeGet } from '../core/utils/objectUtils';

/** Framework-neutral production primitive shared by domain analysis and AI search. */
export function calculatePlayerPotentialPips(G: GameState): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  Object.values(G.players).forEach((player) => {
    const pips: Record<string, number> = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    Object.entries(G.board.vertices).forEach(([vertexId, vertex]) => {
      if (vertex.owner !== player.id) return;
      const multiplier = vertex.type === 'city' ? 2 : 1;
      for (const hexId of getHexesForVertex(vertexId)) {
        const hex = safeGet(G.board.hexes, hexId);
        if (!hex?.tokenValue || !hex.terrain) continue;
        const resource = TERRAIN_CONFIG[hex.terrain];
        if (!resource) continue;
        pips[resource] = (pips[resource] || 0) + (PIP_MAP[hex.tokenValue] || 0) * multiplier;
      }
    });
    result[player.id] = pips;
  });
  return result;
}
