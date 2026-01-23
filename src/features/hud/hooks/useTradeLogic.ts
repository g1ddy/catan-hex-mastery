import { useMemo } from 'react';
import { GameState } from '../../../game/core/types';
import { calculateTrade, getExchangeRates, TradeResult, ExchangeRates } from '../../../game/mechanics/trade';
import { STAGE_MOVES } from '../../../game/core/constants';
import { Ctx } from 'boardgame.io';

export interface UseTradeLogicResult {
    rates: ExchangeRates['rates'];
    portEdges: ExchangeRates['portEdges'];
    tradeResult: TradeResult;
    canTrade: boolean;
    highlightedPortEdgeId: string | undefined;
}

export const useTradeLogic = (G: GameState, ctx: Ctx): UseTradeLogicResult => {
    return useMemo(() => {
        const activeStage = ctx.activePlayers?.[ctx.currentPlayer];
        const allowedMoves = activeStage && STAGE_MOVES[activeStage as keyof typeof STAGE_MOVES];
        const canTradeBank = allowedMoves && (allowedMoves as readonly string[]).includes('tradeBank');

        const { rates, portEdges } = getExchangeRates(G, ctx.currentPlayer);
        const resources = G.players[ctx.currentPlayer]?.resources || { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

        const tradeResult = calculateTrade(resources, rates, portEdges);

        const canTrade = tradeResult.canTrade && !!canTradeBank;
        const highlightedPortEdgeId = canTrade ? tradeResult.usedPortEdgeId : undefined;

        return {
            rates,
            portEdges,
            tradeResult,
            canTrade,
            highlightedPortEdgeId
        };
    }, [G, ctx.currentPlayer, ctx.activePlayers, ctx.phase]);
};
