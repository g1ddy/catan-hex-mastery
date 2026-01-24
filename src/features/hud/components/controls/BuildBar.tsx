import React from 'react';
import { Handshake } from 'lucide-react';
import { BUILD_COSTS, BANK_TRADE_GIVE_AMOUNT, BANK_TRADE_RECEIVE_AMOUNT } from '../../../../game/core/config';
import { BUILD_BUTTON_CONFIG } from '../../../../shared/components/uiConfig';
import { StrategicAdvice } from '../../../../game/analysis/coach';
import { TradeResult } from '../../../../game/mechanics/trade';
import { BuildMode } from '../../types';

interface BuildBarProps {
    affordMap: Record<string, boolean>;
    isMoveAllowed: (moveName: string) => boolean;
    buildMode: BuildMode;
    setBuildMode: (mode: BuildMode) => void;
    canTrade: boolean;
    tradeResult: TradeResult;
    onTrade: () => void;
    isCoachModeEnabled: boolean;
    advice: StrategicAdvice | null;
}

export const BuildBar: React.FC<BuildBarProps> = ({
    affordMap,
    isMoveAllowed,
    buildMode,
    setBuildMode,
    canTrade,
    tradeResult,
    onTrade,
    isCoachModeEnabled,
    advice
}) => {
    const moveNameMap: Record<string, string> = {
        road: 'buildRoad',
        settlement: 'buildSettlement',
        city: 'buildCity'
    };

    const costString = (type: keyof typeof BUILD_COSTS) => {
         const cost = BUILD_COSTS[type];
         const parts = Object.entries(cost).map(([res, amt]) => `${amt} ${res.charAt(0).toUpperCase() + res.slice(1)}`);
         return `Cost: ${parts.join(', ')}`;
    };

    const getButtonClass = (mode: BuildMode, isRecommended: boolean) => {
        const base = "btn-focus-ring";

        // Highlight if recommended
        if (isRecommended) {
             return `${base} bg-amber-500 text-slate-900 border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse motion-reduce:animate-none`;
        }

        if (buildMode === mode) return `${base} bg-amber-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.5)]`;
        return `${base} bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed`;
    };

    const toggleBuildMode = (mode: BuildMode) => {
        setBuildMode(buildMode === mode ? null : mode);
    };

    // Trade Logic
    const canTradeAllowed = canTrade && isMoveAllowed('tradeBank');
    const tradeTooltip = canTradeAllowed
        ? JSON.stringify({
            give: tradeResult.give,
            receive: tradeResult.receive,
            giveAmount: tradeResult.giveAmount,
            receiveAmount: BANK_TRADE_RECEIVE_AMOUNT
        })
        : `Need ${BANK_TRADE_GIVE_AMOUNT} of a resource (or less with ports) to trade`;

    return (
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {/* Trade Button */}
            <div
                className="inline-block flex-shrink-0 border-r border-slate-700/50 pr-1"
                data-tooltip-id="trade-tooltip"
                data-tooltip-content={tradeTooltip}
                data-testid="trade-button-container"
            >
                <button
                    onClick={onTrade}
                    disabled={!canTrade}
                    aria-label="Trade 4:1"
                    className={`p-3 rounded-lg flex items-center justify-center transition-all ${
                        canTrade
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white btn-focus-ring"
                        : "bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed"
                    }`}
                >
                    <Handshake size={20} />
                </button>
            </div>

            {BUILD_BUTTON_CONFIG.map(({ type, Icon, ariaPrefix }) => {
                const affordable = affordMap[type];
                const moveAllowed = isMoveAllowed(moveNameMap[type]);

                // Enable button if it is affordable OR if it is currently selected (to allow deselection)
                // But strictly only if the move is allowed in the current stage.
                const isEnabled = !!moveAllowed && (affordable || buildMode === type);

                // Coach Highlight Logic
                // Highlight if:
                // 1. Coach Mode is ON
                // 2. Button is enabled (affordable + allowed)
                // 3. Move is in recommended moves
                const isRecommended = !!(
                    isCoachModeEnabled &&
                    isEnabled &&
                    advice &&
                    advice.recommendedMoves.includes(moveNameMap[type])
                );

                return (
                    <div key={type} className="inline-block" data-tooltip-id="cost-tooltip" data-tooltip-content={JSON.stringify(BUILD_COSTS[type])}>
                        <button
                            onClick={() => toggleBuildMode(type)}
                            disabled={!isEnabled}
                            aria-label={`${ariaPrefix} (${costString(type)})`}
                            aria-pressed={buildMode === type}
                            className={`p-3 rounded-lg transition-all flex items-center justify-center ${getButtonClass(type, isRecommended)}`}
                        >
                            <Icon size={20} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
