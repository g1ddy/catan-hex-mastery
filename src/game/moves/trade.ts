import { Move } from 'boardgame.io';
import { BANK_TRADE_GIVE_AMOUNT, BANK_TRADE_RECEIVE_AMOUNT } from '../config';
import { GameState } from '../types';
import { calculateTrade } from '../mechanics/trade';
import { RuleEngine } from '../rules/validator';

export const tradeBank: Move<GameState> = ({ G, ctx }) => {
    // 1. Delegate Validation to Rule Engine
    RuleEngine.validateMoveOrThrow(G, ctx, 'tradeBank', []);

    // 2. Calculate Execution Details (since Validation doesn't return data)
    // Note: We know it's valid, so we trust calculateTrade here, but good practice to keep logic consistent.
    // eslint-disable-next-line security/detect-object-injection
    const player = G.players[ctx.currentPlayer];
    const { give, receive } = calculateTrade(player.resources);

    // 3. Execute
    // eslint-disable-next-line security/detect-object-injection -- 'give' is a validated keyof Resources from calculateTrade
    player.resources[give] -= BANK_TRADE_GIVE_AMOUNT;
    // eslint-disable-next-line security/detect-object-injection -- 'receive' is a validated keyof Resources from calculateTrade
    player.resources[receive] += BANK_TRADE_RECEIVE_AMOUNT;
};
