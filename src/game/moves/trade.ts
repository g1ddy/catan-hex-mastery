import { Move } from 'boardgame.io';
import { GameState, Resources } from '../types';

export const RESOURCE_ORDER: (keyof Resources)[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

export interface TradeResult {
    give: keyof Resources;
    receive: keyof Resources;
    canTrade: boolean;
}

/**
 * Calculates the best trade based on the "Most for Least" rule.
 * Tie-breaking: Uses fixed order (Wood, Brick, Sheep, Wheat, Ore).
 */
export const calculateTrade = (resources: Resources): TradeResult => {
    let maxRes: keyof Resources = RESOURCE_ORDER[0];
    let minRes: keyof Resources = RESOURCE_ORDER[0];
    let maxVal = -1;
    let minVal = Infinity;

    for (const res of RESOURCE_ORDER) {
        const val = resources[res];

        // strictly greater to prefer earlier in list for ties?
        // No, "Most" -> if we have 5 wood, 5 brick. maxVal starts -1.
        // Wood (5) > -1 -> max=Wood.
        // Brick (5) > 5? No. So ties keep the first one.
        if (val > maxVal) {
            maxVal = val;
            maxRes = res;
        }

        // strictly less to prefer earlier in list for ties?
        // 0 wood, 0 brick. minVal starts Inf.
        // Wood (0) < Inf -> min=Wood.
        // Brick (0) < 0? No. So ties keep the first one.
        if (val < minVal) {
            minVal = val;
            minRes = res;
        }
    }

    return {
        give: maxRes,
        receive: minRes,
        canTrade: maxVal >= 4
    };
};

export const tradeBank: Move<GameState> = ({ G, ctx }) => {
    const player = G.players[ctx.currentPlayer];
    const { give, receive, canTrade } = calculateTrade(player.resources);

    if (!canTrade) {
        throw new Error("You need at least 4 of a resource to trade.");
    }

    player.resources[give] -= 4;
    player.resources[receive] += 1;
};
