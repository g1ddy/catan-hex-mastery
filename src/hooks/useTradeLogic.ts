import { useMemo } from 'react';
import { GameState } from '../game/types';
import { calculateTrade, getTradeRates, TradeResult, ExchangeRates } from '../game/rules/trade';
import { STAGE_MOVES } from '../game/constants';
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

        const { rates, portEdges } = getTradeRates(G, ctx.currentPlayer);
        const tradeResult = calculateTrade(G, ctx.currentPlayer);

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
