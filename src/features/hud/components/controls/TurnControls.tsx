import React from 'react';
import { Loader2, ArrowRight, Dices as Dice } from 'lucide-react';
import { RollStatus } from '../../../../game/core/types';

interface TurnControlsProps {
    isMoveAllowed: (moveName: string) => boolean;
    isEndingTurn: boolean;
    onEndTurn: () => void;
    isRolling: boolean;
    onRoll: () => void;
    rollStatus: RollStatus;
    lastRoll: [number, number];
    isRollingStage: boolean;
}

export const TurnControls: React.FC<TurnControlsProps> = ({
    isMoveAllowed,
    isEndingTurn,
    onEndTurn,
    isRolling,
    onRoll,
    rollStatus,
    lastRoll,
    isRollingStage
}) => {
    const endTurnLabel = isEndingTurn ? "Ending..." : "End";
    const endTurnLabelDesktop = isEndingTurn ? "Ending Turn..." : "End Turn";
    const endTurnIcon = isEndingTurn ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <ArrowRight size={16} />;

    const rollLabel = isRolling ? "Rolling..." : "Roll";
    const rollIcon = isRolling ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <Dice size={16} />;

    const lastRollSum = lastRoll[0] + lastRoll[1];
    const showLastRoll = !isMoveAllowed('rollDice') && lastRollSum > 0;
    const showRollButton = isMoveAllowed('rollDice') || isRollingStage; // Keep visible during transition/check

    return (
        <>
            {/* End Turn */}
            <button
                onClick={onEndTurn}
                disabled={!isMoveAllowed('endTurn') || isEndingTurn}
                aria-label={endTurnLabelDesktop}
                className="flex items-center gap-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-lg shadow transition-all active:scale-95 disabled:active:scale-100 font-bold text-sm ml-2 whitespace-nowrap btn-focus-ring"
            >
                <span className="md:hidden">{endTurnLabel}</span>
                <span className="hidden md:inline">{endTurnLabelDesktop}</span>
                {endTurnIcon}
            </button>

            {/* Right Section: Roll Button OR Last Roll */}
            {showRollButton && (
                <button
                    onClick={onRoll}
                    disabled={rollStatus !== RollStatus.IDLE}
                    aria-label={rollLabel}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-lg shadow-lg border border-blue-400/50 transition-all active:scale-95 disabled:active:scale-100 font-bold text-sm whitespace-nowrap btn-focus-ring"
                >
                    {rollIcon}
                    <span>{rollLabel}</span>
                </button>
            )}

            {showLastRoll && (
                    <div
                    className="flex items-center gap-2 ml-1 px-2 py-1 border-l border-slate-700/50 cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                    data-tooltip-id="dice-tooltip"
                    data-tooltip-content={JSON.stringify({ d1: lastRoll[0], d2: lastRoll[1] })}
                    tabIndex={0}
                    role="img"
                    aria-label={`Last roll: ${lastRollSum}`}
                    >
                        <Dice className="text-blue-400" size={20} aria-hidden="true" />
                        <span className="text-xl font-bold text-white" aria-hidden="true">{lastRollSum}</span>
                    </div>
            )}
        </>
    );
};
