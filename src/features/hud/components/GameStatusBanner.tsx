import React, { useEffect } from 'react';
import { Ctx } from 'boardgame.io';
import { UiMode, BuildMode } from '../../shared/types';
import { useGameStatusMessage, CustomMessage } from '../hooks/useGameStatusMessage';

export interface GameStatusBannerProps {
    ctx: Ctx;
    playerID: string | null;
    uiMode: UiMode;
    buildMode: BuildMode;
    customMessage?: CustomMessage | null;
    onCustomMessageClear?: () => void;
    customMessageDuration?: number;
}

export const GameStatusBanner: React.FC<GameStatusBannerProps> = ({
    ctx,
    playerID,
    uiMode,
    buildMode,
    customMessage,
    onCustomMessageClear,
    customMessageDuration = 3000
}) => {
    // Auto-clear custom message
    useEffect(() => {
        if (customMessage && onCustomMessageClear) {
            const timer = setTimeout(() => {
                onCustomMessageClear();
            }, customMessageDuration);
            return () => clearTimeout(timer);
        }
    }, [customMessage, onCustomMessageClear, customMessageDuration]);

    const { message, colorClass } = useGameStatusMessage(ctx, playerID, uiMode, buildMode, customMessage);

    // Unified Return
    return (
        <div
            data-testid="game-status-banner"
            role="status"
            aria-live="polite"
            className="animate-enter w-fit max-w-[60vw] md:max-w-fit bg-slate-800/90 backdrop-blur shadow-lg rounded-full pointer-events-auto ring-1 ring-white/10 px-6 py-3 flex items-center justify-center"
        >
            <span className={`text-lg font-bold truncate ${colorClass}`}>
                {message}
            </span>
        </div>
    );
};
