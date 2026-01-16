import { Move } from 'boardgame.io';
import { BANK_TRADE_GIVE_AMOUNT, BANK_TRADE_RECEIVE_AMOUNT } from '../config';
import { GameState } from '../types';
import { calculateTrade } from '../mechanics/trade';

export const tradeBank: Move<GameState> = ({ G, ctx }) => {
    const player = G.players[ctx.currentPlayer];
    const { give, receive, canTrade } = calculateTrade(player.resources);

    if (!canTrade) {
        throw new Error(`You need at least ${BANK_TRADE_GIVE_AMOUNT} of a resource to trade.`);
    }

    // eslint-disable-next-line security/detect-object-injection -- 'give' is a validated keyof Resources from calculateTrade
    player.resources[give] -= BANK_TRADE_GIVE_AMOUNT;
    // eslint-disable-next-line security/detect-object-injection -- 'receive' is a validated keyof Resources from calculateTrade
    player.resources[receive] += BANK_TRADE_RECEIVE_AMOUNT;
};
