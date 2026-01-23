import { BANK_TRADE_GIVE_AMOUNT } from '../core/config';
import { GameState, Resources } from '../core/types';
import { safeGet } from '../../game/core/utils/objectUtils';

export const RESOURCE_ORDER: (keyof Resources)[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

export interface TradeResult {
    give: keyof Resources;
    giveAmount: number;
    receive: keyof Resources;
    canTrade: boolean;
    usedPortEdgeId?: string;
}

export interface ExchangeRates {
    rates: Record<keyof Resources, number>;
    portEdges: Partial<Record<keyof Resources, string>>; // Resource -> EdgeID (Port Location)
}

/**
 * Calculates the exchange rates for a player based on their ports.
 */
export const getExchangeRates = (G: GameState, playerID: string): ExchangeRates => {
    // Default rates: 4:1 for everything
    const rates: Record<keyof Resources, number> = {
        wood: BANK_TRADE_GIVE_AMOUNT,
        brick: BANK_TRADE_GIVE_AMOUNT,
        sheep: BANK_TRADE_GIVE_AMOUNT,
        wheat: BANK_TRADE_GIVE_AMOUNT,
        ore: BANK_TRADE_GIVE_AMOUNT
    };

    const portEdges: Partial<Record<keyof Resources, string>> = {};

    // Iterate all ports on the board
    Object.values(G.board.ports).forEach(port => {
        // Check if player owns any vertex of this port
        const ownsPort = port.vertices.some(vId => {
            const vertex = safeGet(G.board.vertices, vId);
            return vertex && vertex.owner === playerID;
        });

        if (ownsPort) {
            if (port.type === '3:1') {
                // Apply 3:1 to all resources, unless they already have a better rate (2:1)
                RESOURCE_ORDER.forEach(res => {
                    if (rates[res] > 3) {
                        rates[res] = 3;
                        portEdges[res] = port.edgeId;
                    }
                });
            } else {
                // Specific resource port (2:1)
                const res = port.type as keyof Resources;
                // 2:1 is always better than 3:1 or 4:1
                rates[res] = 2;
                portEdges[res] = port.edgeId;
            }
        }
    });

    return { rates, portEdges };
};

/**
 * Calculates the best trade.
 * Priority:
 * 1. Maximize Remainder (Quantity - Cost).
 * 2. Tie-breaker: Standard Order (Implicit in sort stability or first match).
 */
export const calculateTrade = (
    resources: Resources,
    exchangeRates?: Record<keyof Resources, number>,
    portEdges?: Partial<Record<keyof Resources, string>>
): TradeResult => {
    // Default rates if not provided
    const rates = exchangeRates || {
        wood: BANK_TRADE_GIVE_AMOUNT,
        brick: BANK_TRADE_GIVE_AMOUNT,
        sheep: BANK_TRADE_GIVE_AMOUNT,
        wheat: BANK_TRADE_GIVE_AMOUNT,
        ore: BANK_TRADE_GIVE_AMOUNT
    };

    // 1. Identify valid trades
    const validTrades = RESOURCE_ORDER
        .filter(res => resources[res] >= rates[res])
        .map(res => {
            const cost = rates[res];
            const quantity = resources[res];
            const remainder = quantity - cost;
            return {
                res,
                cost,
                quantity,
                remainder
            };
        });

    if (validTrades.length === 0) {
        return {
            give: 'wood',
            giveAmount: 4,
            receive: 'brick',
            canTrade: false
        };
    }

    // 2. Sort trades to find the best one
    validTrades.sort((a, b) => {
        // Primary: Remainder Descending
        if (b.remainder !== a.remainder) {
            return b.remainder - a.remainder;
        }
        // Secondary: Resource Order (Stable Tie-breaker)
        const indexA = RESOURCE_ORDER.indexOf(a.res);
        const indexB = RESOURCE_ORDER.indexOf(b.res);
        return indexA - indexB;
    });

    const bestTrade = validTrades[0];
    const give = bestTrade.res;
    const giveAmount = bestTrade.cost;

    // 3. Determine 'Receive'
    const otherResources = RESOURCE_ORDER.filter(r => r !== give);
    // eslint-disable-next-line security/detect-object-injection
    const minVal = Math.min(...otherResources.map(r => resources[r]));
    // eslint-disable-next-line security/detect-object-injection
    const receive = otherResources.find(r => resources[r] === minVal)!;

    return {
        give,
        giveAmount,
        receive,
        canTrade: true,
        usedPortEdgeId: portEdges ? portEdges[give] : undefined
    };
};
