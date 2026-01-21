import { GameState } from '../types';
import { calculateTrade as calcTradeMechanic, getExchangeRates as getRatesMechanic, TradeResult, ExchangeRates } from '../mechanics/trade';
import { isValidPlayer } from '../../utils/validation';
import { ValidationResult } from './spatial'; // Using ValidationResult from spatial for consistency? Or define generic?
// Actually ValidationResult is defined in common/validator types usually.
// It is exported from spatial.ts in this codebase.

import { BANK_TRADE_GIVE_AMOUNT } from '../constants';

// Re-export types
export type { TradeResult, ExchangeRates };

/**
 * Returns the exchange rates and port edges for a player.
 */
export const getTradeRates = (G: GameState, playerID: string): ExchangeRates => {
    if (!isValidPlayer(playerID, G)) {
        // Return default/worst rates if player invalid
        return {
            rates: { wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 4 },
            portEdges: {}
        };
    }
    return getRatesMechanic(G, playerID);
};

/**
 * Calculates the best available trade for a player based on their current resources.
 */
export const calculateTrade = (G: GameState, playerID: string): TradeResult => {
     if (!isValidPlayer(playerID, G)) {
         return {
             give: 'wood', // Dummy value to satisfy type check
             receive: 'brick', // Dummy value to satisfy type check
             giveAmount: 0,
             canTrade: false,
             usedPortEdgeId: undefined
         };
     }
     const player = G.players[playerID];
     const { rates, portEdges } = getRatesMechanic(G, playerID);
     return calcTradeMechanic(player.resources, rates, portEdges);
};

/**
 * Validates the "Trade Bank" move.
 */
export const validateTradeBank = (G: GameState, playerID: string): ValidationResult<TradeResult> => {
    if (!isValidPlayer(playerID, G)) {
        return { isValid: false, reason: "Invalid player" };
    }

    const result = calculateTrade(G, playerID);

    if (!result.canTrade) {
        return { isValid: false, reason: `You need at least ${BANK_TRADE_GIVE_AMOUNT} of a resource (or less with ports) to trade.` };
    }

    return { isValid: true, data: result };
};
