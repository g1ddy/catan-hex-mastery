import { TERRAIN_CONFIG, PIP_MAP, GameState } from '../core/config';
import { getHexesForVertex } from '../geometry/hexUtils';
import { safeGet } from '../../game/core/utils/objectUtils';

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
