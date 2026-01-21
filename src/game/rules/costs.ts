import { GameState, Resources } from '../types';
import { BUILD_COSTS } from '../constants';
import { isValidPlayer } from '../../utils/validation';
import { canAfford as canAffordResources } from '../mechanics/costs';

export type BuildType = keyof typeof BUILD_COSTS;

/**
 * Checks if a player has enough resources for a specific build cost.
 */
export const canAfford = (
    G: GameState,
    playerID: string,
    cost: Partial<Resources>
): boolean => {
    // Security check: Invalid player cannot afford anything
    if (!isValidPlayer(playerID, G)) return false;

    // eslint-disable-next-line security/detect-object-injection
    const resources = G.players[playerID].resources;
    return canAffordResources(resources, cost);
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

/**
 * Returns a map of all build types and whether the player can afford them.
 * This is the primary facade for UI and Bots to check affordability.
 */
export const getAffordableBuilds = (G: GameState, playerID: string): Record<BuildType, boolean> => {
    return {
        road: canAffordRoad(G, playerID),
        settlement: canAffordSettlement(G, playerID),
        city: canAffordCity(G, playerID),
        devCard: canAffordDevCard(G, playerID)
    };
};
