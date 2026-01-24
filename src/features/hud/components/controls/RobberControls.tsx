import React from 'react';

interface RobberControlsProps {
    pendingRobberHex: string | null;
    onConfirm: () => void;
    className?: string;
}

const BeginPlacementButton: React.FC<{ onClick: () => void, className?: string, label?: string }> = ({ onClick, className, label = "Begin Placement" }) => (
    <button
        onClick={onClick}
        className={className}
    >
        <span className={className?.includes('text-lg') ? "text-lg font-bold" : "text-base font-bold"}>{label}</span>
    </button>
);

export const RobberControls: React.FC<RobberControlsProps> = ({
    pendingRobberHex,
    onConfirm,
    className = ''
}) => {
    const hasSelection = !!pendingRobberHex;

    return (
        <div className={`flex-grow flex pointer-events-auto ${className}`}>
            <BeginPlacementButton
                onClick={() => {
                    if (hasSelection) {
                        onConfirm();
                    }
                }}
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
