import { GameState } from '../types';
import { BUILD_COSTS } from '../config';
import { isValidPlayer } from '../../utils/validation';

/**
 * Checks if a player has enough resources for a specific build cost.
 */
export const canAfford = (
    G: GameState,
    playerID: string,
    cost: { wood?: number; brick?: number; sheep?: number; wheat?: number; ore?: number }
): boolean => {
    // Security check: Invalid player cannot afford anything
    if (!isValidPlayer(G, playerID)) return false;

    // eslint-disable-next-line security/detect-object-injection
    const resources = G.players[playerID].resources;

    // Cast to any to iterate keys, or type strictly if we export ResourceType
    for (const [res, amount] of Object.entries(cost)) {
        if (amount && resources[res as keyof typeof resources] < amount) {
            return false;
        }
    }
    return true;
};

/**
 * Checks if a player can afford to build a road.
 */
export const canAffordRoad = (G: GameState, playerID: string): boolean => {
    return canAfford(G, playerID, BUILD_COSTS.road);
};

/**
 * Checks if a player can afford to build a settlement.
 */
export const canAffordSettlement = (G: GameState, playerID: string): boolean => {
    return canAfford(G, playerID, BUILD_COSTS.settlement);
};

/**
 * Checks if a player can afford to build a city.
 */
export const canAffordCity = (G: GameState, playerID: string): boolean => {
    return canAfford(G, playerID, BUILD_COSTS.city);
};

/**
 * Checks if a player can afford to buy a development card.
 */
export const canAffordDevCard = (G: GameState, playerID: string): boolean => {
    return canAfford(G, playerID, BUILD_COSTS.devCard);
};
