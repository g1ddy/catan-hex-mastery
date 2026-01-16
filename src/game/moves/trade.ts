import { Move } from 'boardgame.io';
import { BANK_TRADE_GIVE_AMOUNT, BANK_TRADE_RECEIVE_AMOUNT } from '../config';
import { GameState } from '../types';
import { RuleEngine } from '../rules/validator';
import { TradeResult } from '../mechanics/trade';

export const tradeBank: Move<GameState> = ({ G, ctx }) => {
    // 1. Delegate Validation and Get Execution Details
    const { give, receive } = RuleEngine.validateMoveOrThrow<TradeResult>(G, ctx, 'tradeBank', []);

    // 2. Execute
    const player = G.players[ctx.currentPlayer]; // eslint-disable-line security/detect-object-injection

    // eslint-disable-next-line security/detect-object-injection -- 'give' is a validated keyof Resources from calculateTrade
    player.resources[give] -= BANK_TRADE_GIVE_AMOUNT;
    // eslint-disable-next-line security/detect-object-injection -- 'receive' is a validated keyof Resources from calculateTrade
    player.resources[receive] += BANK_TRADE_RECEIVE_AMOUNT;
};
