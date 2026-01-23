import { useState, useEffect } from 'react';
import { GameState, RollStatus } from '../../../game/core/types';
import { Ctx } from 'boardgame.io';
import { PHASES, STAGES, STAGE_MOVES } from '../../../game/core/constants';
import { getAffordableBuilds } from '../../../game/mechanics/costs';
import { useTradeLogic } from './useTradeLogic';
import { safeMove } from '../../../shared/utils/feedback';
import { BuildMode } from '../components/GameControls';
import { TradeResult } from '../../../game/mechanics/trade';

export interface UseGameControlsResult {
    isSetup: boolean;
    isGameplay: boolean;
    activeStage: string | undefined;
    isRollingStage: boolean;
    isRobberStage: boolean;
    isEndingTurn: boolean;
    affordMap: Record<string, boolean>;
    canTrade: boolean;
    tradeResult: TradeResult;
    isRolling: boolean;
    lastRollSum: number;
    // Actions
    isMoveAllowed: (moveName: string) => boolean;
    handleEndTurn: () => void;
    handleRoll: () => void;
    handleTrade: () => void;
}

export const useGameControls = (
    G: GameState,
    ctx: Ctx,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    moves: any,
    setBuildMode: (mode: BuildMode) => void
): UseGameControlsResult => {
    const isSetup = ctx.phase === PHASES.SETUP;
    const isGameplay = ctx.phase === PHASES.GAMEPLAY;
    const activeStage = ctx.activePlayers?.[ctx.currentPlayer];
    const isRollingStage = isGameplay && activeStage === STAGES.ROLLING;
    const isRobberStage = isGameplay && activeStage === STAGES.ROBBER;

    const [isEndingTurn, setIsEndingTurn] = useState(false);

    useEffect(() => {
        setIsEndingTurn(false);
    }, [ctx.currentPlayer, ctx.phase, activeStage]);

    // Trade Logic
    const { tradeResult, canTrade } = useTradeLogic(G, ctx);

    // Resources & Affordability
    const resources = G.players[ctx.currentPlayer]?.resources || { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const affordMap = getAffordableBuilds(resources);

    // Move Allowed Helper
    const isMoveAllowed = (moveName: string): boolean => {
        const allowedMoves = activeStage && STAGE_MOVES[activeStage as keyof typeof STAGE_MOVES];
        return !!allowedMoves && (allowedMoves as readonly string[]).includes(moveName);
    };

    // Actions
    const handleEndTurn = () => {
        if (!isMoveAllowed('endTurn')) return;
        setIsEndingTurn(true);
        setBuildMode(null);
        if (!safeMove(() => moves.endTurn())) {
            setIsEndingTurn(false);
        }
    };

    const handleRoll = () => {
        if (!isMoveAllowed('rollDice')) return;
        safeMove(() => moves.rollDice());
    };

    const handleTrade = () => {
        if (canTrade && isMoveAllowed('tradeBank')) {
            safeMove(() => moves.tradeBank());
        }
    };

    const isRolling = G.rollStatus === RollStatus.ROLLING;
    const lastRollSum = G.lastRoll[0] + G.lastRoll[1];

    return {
        isSetup,
        isGameplay,
        activeStage,
        isRollingStage,
        isRobberStage,
        isEndingTurn,
        affordMap,
        canTrade,
        tradeResult,
        isRolling,
        lastRollSum,
        isMoveAllowed,
        handleEndTurn,
        handleRoll,
        handleTrade
    };
};
