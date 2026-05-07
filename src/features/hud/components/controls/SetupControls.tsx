import { STAGES } from '../../../../game/core/constants';
import { UiMode } from '../../../shared/types';
import { ActionButton } from './ActionButton';

interface SetupControlsProps {
    uiMode: UiMode;
    setUiMode: (mode: UiMode) => void;
    activeStage: string | undefined;
    className?: string;
    isMyTurn: boolean;
}

export function SetupControls({
    uiMode,
    setUiMode,
    activeStage,
    className = '',
    isMyTurn
}: SetupControlsProps) {
    const canInteract = isMyTurn && (activeStage === STAGES.PLACE_SETTLEMENT || activeStage === STAGES.PLACE_ROAD);

    const handleClick = () => {
        if (canInteract && uiMode === 'viewing') {
            setUiMode('placing');
        }
    };

    if (uiMode === 'viewing') {
         const baseClasses = 'w-full h-full flex items-center justify-center text-white px-4 py-3 backdrop-blur-md rounded-xl shadow-lg transition-all active:scale-95 btn-focus-ring';
         const interactiveClasses = 'bg-blue-600 hover:bg-blue-500 border border-blue-400/50 animate-pulse motion-reduce:animate-none';
         const disabledClasses = 'bg-slate-700 cursor-not-allowed text-slate-400 border border-slate-600';
         return (
            <div className={`flex-grow flex pointer-events-auto ${className}`}>
                <ActionButton
                    onClick={handleClick}
                    disabled={!canInteract}
                    className={`${baseClasses} ${canInteract ? interactiveClasses : disabledClasses}`}
                    label={canInteract ? "Begin Placement" : "Waiting for Opponent..."}
                />
            </div>
         );
    }

    return (
         <div className={`flex-grow flex pointer-events-auto ${className}`}>
             <ActionButton
                onClick={() => setUiMode('viewing')}
                label="Cancel Placement"
                className="w-full h-full flex items-center justify-center text-white px-4 py-3 bg-red-600 hover:bg-red-500 backdrop-blur-md border border-red-500/50 rounded-xl shadow-lg transition-all active:scale-95 btn-focus-ring"
             />
         </div>
    );
}
