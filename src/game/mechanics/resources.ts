import { GameState, TERRAIN_CONFIG, Resources, TerrainType } from '../types';
import { getVerticesForHex } from '../hexUtils';

/**
 * Mapping of TerrainType to Resource string.
 * Excludes non-resource terrains (Desert, Sea).
 * Derived from TERRAIN_CONFIG to ensure single source of truth.
 */
export const TERRAIN_TO_RESOURCE: Partial<Record<TerrainType, string>> = Object.entries(TERRAIN_CONFIG).reduce((acc, [terrain, resource]) => {
    if (resource) {
        acc[terrain as TerrainType] = resource;
    }
    return acc;
}, {} as Partial<Record<TerrainType, string>>);

/**
 * Distributes resources based on the current dice roll.
 * Modifies G in place and returns the rewards map for logging/UI.
 */
export function distributeResources(G: GameState, roll: number): Record<string, Partial<Resources>> {
    const rewards: Record<string, Partial<Resources>> = {};

    // Helper to add rewards
    const addReward = (playerId: string, resource: keyof Resources, amount: number) => {
        if (!rewards[playerId]) {
            rewards[playerId] = {};
        }
        const current = rewards[playerId][resource] || 0;
        rewards[playerId][resource] = current + amount;

        // Update player state
        if (G.players[playerId]) {
            G.players[playerId].resources[resource] += amount;
        }
    };

    if (roll === 7) {
        // Robber logic (future)
        return rewards;
    }

    Object.values(G.board.hexes).forEach(hex => {
        if (hex.tokenValue === roll) {
            const resource = TERRAIN_CONFIG[hex.terrain];
            if (resource) { // Skip Desert/Sea
                const vertices = getVerticesForHex(hex.coords);
                vertices.forEach(vId => {
                    const vertex = G.board.vertices[vId];
                    if (vertex && G.players[vertex.owner]) {
                        const amount = vertex.type === 'city' ? 2 : 1;
                        addReward(vertex.owner, resource as keyof Resources, amount);
                    }
                });
            }
        }
    });

    return rewards;
}
