import React, { useMemo, useState, useEffect } from 'react';
import { GameState, Resources, ProductionEvent, RobberEvent, RollStatus } from '../../../game/core/types';
import {
    Trees, BrickWall, Wheat, Mountain, Cloud, Dices, Ghost, ArrowRight
} from 'lucide-react';
import { NO_YIELD_EMOJIS, getRandomEmoji } from './constants/emojis';
import { DiceIcons } from '../../shared/components/DiceIcons';
import { RESOURCE_META } from '../../shared/config/uiConfig';
import { isValidPlayer } from '../../../game/core/validation';

export interface GameNotificationProps {
    G: GameState;
}

const RESOURCE_ICONS: Record<keyof Resources, React.ReactNode> = {
    wood: <Trees size={14} className="text-green-500" />,
    brick: <BrickWall size={14} className="text-orange-500" />,
    wheat: <Wheat size={14} className="text-yellow-500" />,
    ore: <Mountain size={14} className="text-slate-400" />,
    sheep: <Cloud size={14} className="text-blue-300" />
};

export const GameNotification: React.FC<GameNotificationProps> = ({ G }) => {
    const [visible, setVisible] = useState(false);

    const isRolling = G.rollStatus === RollStatus.ROLLING;
    const notification = G.notification;

    // Local state to persist notification data during fade-out
    const [displayNotification, setDisplayNotification] = useState(notification);

    useEffect(() => {
        if (isRolling) {
            setVisible(true);
            // When rolling starts, we don't necessarily clear displayNotification immediately
            // or maybe we do?
            // If we are rolling, we show the Rolling spinner.
            return;
        }

        if (notification) {
            setDisplayNotification(notification);
            setVisible(true);

            // Auto-hide notification after 5s
            const timer = setTimeout(() => setVisible(false), 5000);
            return () => clearTimeout(timer);
        } else if (!isRolling) {
            // If no notification and not rolling, hide.
            setVisible(false);
        }
    }, [notification, isRolling]);

    // Derived state from displayNotification
    const hasAnyResources = useMemo(() => {
        if (!displayNotification || displayNotification.type !== 'production') return false;
        return Object.values(displayNotification.rewards).some(res =>
            Object.values(res).some(amount => amount > 0)
        );
    }, [displayNotification]);

    const randomEmoji = useMemo(() => {
        if (hasAnyResources) return null;
        return getRandomEmoji(NO_YIELD_EMOJIS);
    }, [hasAnyResources, displayNotification]);

    // If invisible and not rolling, nothing to render (eventually unmount or hide)
    // But we use CSS opacity/transform for transitions usually.
    // If displayNotification is null and not rolling, we truly can't render much.
    if (!displayNotification && !isRolling) return null;

    const renderProductionContent = (evt: ProductionEvent) => (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 transition-opacity duration-300 ${isRolling ? 'opacity-0' : 'opacity-100'}`}>
            {!hasAnyResources ? (
                <div className="text-2xl animate-pulse motion-reduce:animate-none" role="img" aria-label="No resources">
                    {randomEmoji}
                </div>
            ) : (
                Object.entries(evt.rewards).map(([pid, res]) => {
                    if (!isValidPlayer(pid, G)) return null;
                    const player = G.players[pid];
                    const hasResources = Object.values(res).some(v => v > 0);

                    if (!hasResources) return null;

                    const playerColor = player.color;

                    return (
                        <div key={pid} className="flex items-center gap-2 bg-slate-700/50 rounded-full px-2 py-0.5">
                            {/* Player Dot */}
                            <div
                                className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                                style={{ backgroundColor: playerColor }}
                            />
                            <span className="text-xs font-bold text-slate-300">P{Number(pid) + 1}</span>

                            {/* Resources */}
                            <div className="flex items-center gap-1.5 ml-1">
                                {Object.entries(res).map(([type, amount]) => {
                                    if (!amount) return null;
                                    return (
                                        <span key={type} className="flex items-center gap-0.5 text-xs font-medium">
                                            +{amount} {
                                                RESOURCE_ICONS[type as keyof Resources]
                                            }
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );

    const renderRobberContent = (evt: RobberEvent) => {
        if (evt.thief === evt.victim || !isValidPlayer(evt.thief, G) || !isValidPlayer(evt.victim, G)) {
            return null;
        }
        const thief = G.players[evt.thief];
        const victim = G.players[evt.victim];

        const resourceMeta = evt.resource ? RESOURCE_META.find(r => r.name === evt.resource) : null;

        return (
            <div className="flex items-center gap-3">
                {/* Thief */}
                <div className="flex items-center gap-2">
                    <div
                        className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                        style={{ backgroundColor: thief.color }}
                    />
                    <span className="font-bold text-sm text-slate-300">
                        {thief.name}
                    </span>
                </div>

                <ArrowRight size={14} className="text-slate-500" />

                {/* Victim */}
                <div className="flex items-center gap-2">
                    <div
                        className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                        style={{ backgroundColor: victim.color }}
                    />
                    <span className="font-bold text-sm text-slate-300">
                        {victim.name}
                    </span>
                </div>

                {/* Resource (if visible/known) */}
                {resourceMeta && (
                    <div className="flex items-center gap-1.5 ml-1 bg-slate-700/50 pl-2 pr-3 py-0.5 rounded-full">
                        <resourceMeta.Icon size={14} className={resourceMeta.color} />
                        <span className="text-xs font-bold text-slate-300 capitalize">
                            {resourceMeta.name}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    // Roll Value for Icon (Production only)
    const [d1, d2] = (displayNotification?.type === 'production')
        ? G.lastRoll
        : [0, 0];

    const renderNotificationContent = () => {
        if (isRolling) return null; // Content hidden when rolling
        if (!displayNotification) return null;

        switch (displayNotification.type) {
            case 'production':
                return renderProductionContent(displayNotification);
            case 'robber':
                return renderRobberContent(displayNotification);
            default: {
                // @ts-ignore
                const _exhaustiveCheck: never = displayNotification;
                return null;
            }
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
