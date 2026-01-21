import { Move } from 'boardgame.io';
import { BANK_TRADE_GIVE_AMOUNT, BANK_TRADE_RECEIVE_AMOUNT } from '../config';
import { GameState } from '../types';
import { RuleEngine } from '../rules/validator';
import { TradeResult } from '../mechanics/trade';

export const tradeBank: Move<GameState> = ({ G, ctx }) => {
    // 1. Delegate Validation and Get Execution Details
    const result = RuleEngine.validateMoveOrThrow<'tradeBank', TradeResult>(G, ctx, 'tradeBank', []);

    // 2. Safety Check (TypeScript Guard)
    // RuleEngine.validateMoveOrThrow throws if invalid, but returns T | undefined.
    // In our specific case, validateTradeBank ALWAYS returns data if valid.
    if (!result) {
        throw new Error("Internal Error: Validation passed but no trade data returned.");
    }

    const { give, receive } = result;

    // 3. Execute

    const player = G.players[ctx.currentPlayer];

    // eslint-disable-next-line security/detect-object-injection -- 'give' is a validated keyof Resources from calculateTrade
    player.resources[give] -= BANK_TRADE_GIVE_AMOUNT;
    // eslint-disable-next-line security/detect-object-injection -- 'receive' is a validated keyof Resources from calculateTrade
    player.resources[receive] += BANK_TRADE_RECEIVE_AMOUNT;
};
