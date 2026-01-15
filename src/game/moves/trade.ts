import { Move } from 'boardgame.io';
import { BANK_TRADE_GIVE_AMOUNT, BANK_TRADE_RECEIVE_AMOUNT } from '../config';
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

        if (val > maxVal) {
            maxVal = val;
            maxRes = res;
        }

        if (val < minVal) {
            minVal = val;
            minRes = res;
        }
    }

    return {
        give: maxRes,
        receive: minRes,
        canTrade: maxVal >= BANK_TRADE_GIVE_AMOUNT
    };
};

export const tradeBank: Move<GameState> = ({ G, ctx }) => {
    const player = G.players[ctx.currentPlayer];
    const { give, receive, canTrade } = calculateTrade(player.resources);

    if (!canTrade) {
        throw new Error(`You need at least ${BANK_TRADE_GIVE_AMOUNT} of a resource to trade.`);
    }

    player.resources[give] -= BANK_TRADE_GIVE_AMOUNT;
    player.resources[receive] += BANK_TRADE_RECEIVE_AMOUNT;
};
