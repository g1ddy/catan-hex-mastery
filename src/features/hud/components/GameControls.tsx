import React from 'react';
import { GameState, ClientMoves } from '../../../game/core/types';
import { Ctx } from 'boardgame.io';
import { safeMove } from '../../shared/utils/feedback';
import { StrategicAdvice } from '../../../game/analysis/coach';
import { useGameControls } from '../hooks/useGameControls';
import { BuildMode, UiMode } from '../../shared/types';
import { SetupControls } from './controls/SetupControls';
import { RobberControls } from './controls/RobberControls';
import { BuildBar } from './controls/BuildBar';
import { TurnControls } from './controls/TurnControls';

export type { BuildMode, UiMode };

export interface GameControlsProps {
    G: GameState;
    ctx: Ctx;
    moves: ClientMoves;
    buildMode: BuildMode;
    setBuildMode: (mode: BuildMode) => void;
    uiMode: UiMode;
    setUiMode: (mode: UiMode) => void;
    className?: string;
    isCoachModeEnabled?: boolean;
    advice?: StrategicAdvice | null;
    pendingRobberHex?: string | null;
}

export const GameControls: React.FC<GameControlsProps> = ({
    G,
    ctx,
    moves,
    buildMode,
    setBuildMode,
    uiMode,
    setUiMode,
    className = '',
    isCoachModeEnabled = false,
    advice = null,
    pendingRobberHex
}) => {
    const {
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
        isMoveAllowed,
        handleEndTurn,
        handleRoll,
        handleTrade
    } = useGameControls(G, ctx, moves, setBuildMode);

    // Setup Phase
    if (isSetup) {
        return (
            <SetupControls
                uiMode={uiMode}
                setUiMode={setUiMode}
                activeStage={activeStage}
                className={className}
            />
        );
    }

    if (isGameplay) {
        // Robber Dismissal
        if (isRobberStage) {
            return (
                <RobberControls
                    pendingRobberHex={pendingRobberHex ?? null}
                    onConfirm={() => {
                        if (pendingRobberHex) {
                            safeMove(() => moves.dismissRobber(pendingRobberHex));
                        }
                    }}
                    className={className}
                />
            );
        }

        return (
             <div className={`flex-grow flex items-center justify-between gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 shadow-lg ${className}`}>

                {/* 1. Build Buttons */}
                <BuildBar
                    affordMap={affordMap}
                    isMoveAllowed={isMoveAllowed}
                    buildMode={buildMode}
                    setBuildMode={setBuildMode}
                    canTrade={canTrade}
                    tradeResult={tradeResult}
                    onTrade={handleTrade}
                    isCoachModeEnabled={isCoachModeEnabled}
                    advice={advice}
                />

                {/* 2. Turn Controls (End Turn & Roll) */}
                <TurnControls
                    isMoveAllowed={isMoveAllowed}
                    isEndingTurn={isEndingTurn}
                    onEndTurn={handleEndTurn}
                    isRolling={isRolling}
                    onRoll={handleRoll}
                    rollStatus={G.rollStatus}
                    lastRoll={G.lastRoll}
                    isRollingStage={isRollingStage}
                />
            </div>
        );
    }

    return null;
};
