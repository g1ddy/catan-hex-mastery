import { TERRAIN_CONFIG, PIP_MAP } from '../core/config';
import { GameState } from '../core/types';
import { getHexesForVertex } from '../geometry/hexUtils';
import { safeGet } from '../core/utils/objectUtils';

/** Framework-neutral Catan production analysis used by both gameplay analysis and AI. */
export function calculatePlayerPotentialPips(G: GameState): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  Object.values(G.players).forEach((player) => {
    const playerPips: Record<string, number> = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

    Object.entries(G.board.vertices).forEach(([vId, vertex]) => {
      if (vertex.owner !== player.id) return;

      const multiplier = vertex.type === 'city' ? 2 : 1;
      for (const hexId of getHexesForVertex(vId)) {
        const hex = safeGet(G.board.hexes, hexId);
        if (!hex?.tokenValue || !hex.terrain) continue;

        const resource = TERRAIN_CONFIG[hex.terrain];
        if (!resource) continue;

        const pips = (PIP_MAP[hex.tokenValue] || 0) * multiplier;
        playerPips[resource] = (playerPips[resource] || 0) + pips;
      }
    });

    result[player.id] = playerPips;
  });

  return result;
}
