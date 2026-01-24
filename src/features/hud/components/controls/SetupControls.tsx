import React from 'react';
import { STAGES } from '../../../../game/core/constants';
import { UiMode } from '../../types';
import { ActionButton } from '../../../../shared/components/ui/ActionButton';

interface SetupControlsProps {
    uiMode: UiMode;
    setUiMode: (mode: UiMode) => void;
    activeStage: string | undefined;
    className?: string;
}

export const SetupControls: React.FC<SetupControlsProps> = ({
    uiMode,
    setUiMode,
    activeStage,
    className = ''
}) => {
    let canInteract = false;

    if (activeStage === STAGES.PLACE_SETTLEMENT) {
        canInteract = true;
    }
    if (activeStage === STAGES.PLACE_ROAD) {
        canInteract = true;
    }

    const handleClick = () => {
        if (canInteract && uiMode === 'viewing') {
            setUiMode('placing');
        }
    };

    if (uiMode === 'viewing') {
         return (
            <div className={`flex-grow flex pointer-events-auto ${className}`}>
                <ActionButton
                    onClick={handleClick}
                    className="w-full h-full flex items-center justify-center text-white px-4 py-3 bg-blue-600 hover:bg-blue-500 backdrop-blur-md border border-blue-400/50 rounded-xl shadow-lg transition-all active:scale-95 btn-focus-ring animate-pulse motion-reduce:animate-none"
                />
            </div>
         );
    }

    return (
         <div className={`flex-grow flex pointer-events-auto ${className}`}>
             <button
                onClick={() => setUiMode('viewing')}
                className="w-full h-full flex items-center justify-center text-white px-4 py-3 bg-red-600 hover:bg-red-500 backdrop-blur-md border border-red-500/50 rounded-xl shadow-lg transition-all active:scale-95 btn-focus-ring"
             >
                 <span className="text-base font-bold">Cancel Placement</span>
             </button>
         </div>
    );
};
