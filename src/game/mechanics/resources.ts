import { GameState, TERRAIN_CONFIG, Resources, TerrainType } from '../core/types';
import { getVerticesForHex } from '../geometry/hexUtils';
import { safeGet } from '../../utils/objectUtils';

/**
 * Mapping of TerrainType to Resource string.
 */
export const TERRAIN_TO_RESOURCE: Partial<Record<TerrainType, keyof Resources>> = Object.entries(TERRAIN_CONFIG).reduce((acc, [terrain, resource]) => {
    if (resource) {
        acc[terrain as TerrainType] = resource as keyof Resources;
    }
    return acc;
}, {} as Partial<Record<TerrainType, keyof Resources>>);

/**
 * Helper to count total resources in a bundle.
 */
export function countResources(resources: Resources): number {
    return Object.values(resources).reduce((sum, count) => sum + count, 0);
}

/**
 * Distributes resources based on the current dice roll.
 * Modifies G in place and returns the rewards map for logging/UI.
 */
export function distributeResources(G: GameState, roll: number): Record<string, Partial<Resources>> {
    const rewards: Record<string, Partial<Resources>> = {};

    const addReward = (playerId: string, resource: keyof Resources, amount: number) => {
        const player = G.players[playerId];
        if (!player) return;

        // Initialize reward object for the player if it doesn't exist
        rewards[playerId] = rewards[playerId] || {};
        const playerRewards = rewards[playerId];

        // Update rewards and player resources safely
        playerRewards[resource] = (playerRewards[resource] || 0) + amount;
        player.resources[resource] += amount;
    };

    if (roll === 7) {
        // Robber logic is handled by the 'rob' move, not distribution.
        return rewards;
    }

    Object.values(G.board.hexes).forEach(hex => {
        // Skip if Robber is present or if roll doesn't match
        if (hex.id === G.robberLocation || hex.tokenValue !== roll) {
            return;
        }

        const resource = TERRAIN_TO_RESOURCE[hex.terrain];
        if (resource) {
            const vertices = getVerticesForHex(hex.coords);
            vertices.forEach(vId => {
                const vertex = safeGet(G.board.vertices, vId);
                if (vertex) {
                    const amount = vertex.type === 'city' ? 2 : 1;
                    addReward(vertex.owner, resource, amount);
                }
            });
        }
    });

    return rewards;
}
