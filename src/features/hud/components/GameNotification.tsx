import React from 'react';
import { GameState, RollStatus } from '../../../game/core/types';
import { Dices, Ghost } from 'lucide-react';
import { DiceIcons } from '../../shared/components/DiceIcons';
import { useAutoDismissNotification } from '../hooks/useAutoDismissNotification';
import { ProductionNotification } from './notifications/ProductionNotification';
import { RobberNotification } from './notifications/RobberNotification';

export interface GameNotificationProps {
    G: GameState;
}

export const GameNotification: React.FC<GameNotificationProps> = ({ G }) => {
    const isRolling = G.rollStatus === RollStatus.ROLLING;
    const { visible, displayNotification } = useAutoDismissNotification(G.notification, isRolling);

    // Derived logic for icon roll value
    const [d1, d2] = (displayNotification?.type === 'production')
        ? G.lastRoll
        : [0, 0];

    // If invisible and not rolling, nothing to render
    if (!displayNotification && !isRolling) return null;

    const renderNotificationContent = () => {
        if (isRolling) return null; // Content hidden when rolling
        if (!displayNotification) return null;

        switch (displayNotification.type) {
            case 'production':
                return <ProductionNotification evt={displayNotification} players={G.players} isRolling={isRolling} />;
            case 'robber':
                return <RobberNotification evt={displayNotification} players={G.players} />;
            default:
                return null;
        }
    };

    return (
        <div
            role="status"
            aria-live="polite"
            className={`${visible ? 'animate-enter' : 'animate-leave'} w-fit max-w-[90vw] bg-slate-800/90 backdrop-blur shadow-lg rounded-full pointer-events-auto ring-1 ring-white/10 px-4 py-2`}
        >
            <div className="flex items-center gap-4 text-slate-100">
                {/* Icon Section */}
                <div className="flex items-center gap-2">
                    {/* If Rolling, show spinner. Else if Production, show Dice. Else show Ghost. */}
                    {isRolling ? (
                         <>
                            <Dices size={24} className="text-amber-400 animate-spin motion-reduce:animate-none" />
                            <span className="font-bold text-lg text-amber-400">Rolling...</span>
                        </>
                    ) : (displayNotification?.type === 'production') ? (
                         <DiceIcons d1={d1} d2={d2} size={20} className="text-amber-400" />
                    ) : (
                        <Ghost size={24} className="text-purple-400" />
                    )}
                </div>

                {/* Vertical Separator - Only if there is content to separate */}
                {(!isRolling && displayNotification) && <div className="h-6 w-px bg-slate-600/50" />}

                {/* Content Section */}
                {renderNotificationContent()}
            </div>
        </div>
    );
};
