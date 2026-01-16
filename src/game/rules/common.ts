import { GameState, Resources } from '../types';
import { isValidPlayer } from '../../utils/validation';
import { canAfford as canAffordResources, getAffordableBuilds } from '../mechanics/costs';

/**
 * Checks if a player has enough resources for a specific build cost.
 */
export const canAfford = (
    G: GameState,
    playerID: string,
    cost: Partial<Resources>
): boolean => {
    // Security check: Invalid player cannot afford anything
    if (!isValidPlayer(G, playerID)) return false;

    // eslint-disable-next-line security/detect-object-injection
    const resources = G.players[playerID].resources;
    return canAffordResources(resources, cost);
};

/**
 * Checks if a player can afford to build a road.
 */
export const canAffordRoad = (G: GameState, playerID: string): boolean => {
    if (!isValidPlayer(G, playerID)) return false;
    // eslint-disable-next-line security/detect-object-injection
    return getAffordableBuilds(G.players[playerID].resources).road;
};

/**
 * Checks if a player can afford to build a settlement.
 */
export const canAffordSettlement = (G: GameState, playerID: string): boolean => {
    if (!isValidPlayer(G, playerID)) return false;
    // eslint-disable-next-line security/detect-object-injection
    return getAffordableBuilds(G.players[playerID].resources).settlement;
};

/**
 * Checks if a player can afford to build a city.
 */
export const canAffordCity = (G: GameState, playerID: string): boolean => {
    if (!isValidPlayer(G, playerID)) return false;
    // eslint-disable-next-line security/detect-object-injection
    return getAffordableBuilds(G.players[playerID].resources).city;
};

/**
 * Checks if a player can afford to buy a development card.
 */
export const canAffordDevCard = (G: GameState, playerID: string): boolean => {
    if (!isValidPlayer(G, playerID)) return false;
    // eslint-disable-next-line security/detect-object-injection
    return getAffordableBuilds(G.players[playerID].resources).devCard;
};
