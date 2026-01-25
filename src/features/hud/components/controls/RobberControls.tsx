import React from 'react';
import { ActionButton } from './ActionButton';

interface RobberControlsProps {
    pendingRobberHex: string | null;
    onConfirm: () => void;
    className?: string;
}

export const RobberControls: React.FC<RobberControlsProps> = ({
    pendingRobberHex,
    onConfirm,
    className = ''
}) => {
    const hasSelection = !!pendingRobberHex;

    return (
        <div className={`flex-grow flex pointer-events-auto ${className}`}>
            <ActionButton
                onClick={onConfirm}
                disabled={!hasSelection}
                className={`w-full h-full flex items-center justify-center text-white px-4 py-3 backdrop-blur-md rounded-xl shadow-lg transition-all active:scale-95 btn-focus-ring ${
                        hasSelection
                        ? "bg-green-600 hover:bg-green-500 border border-green-500/50 animate-pulse motion-reduce:animate-none"
                        : "bg-slate-700 cursor-not-allowed text-slate-400 border border-slate-600"
                }`}
                label={hasSelection ? "Confirm Robber Placement" : "Select New Location"}
            />
        </div>
    );
};
