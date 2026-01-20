import React, { useMemo, useState, useEffect } from 'react';
import { GameState, Resources, ProductionEvent, RobberEvent } from '../game/types';
import {
    Trees, BrickWall, Wheat, Mountain, Cloud, Dices, Ghost, ArrowRight
} from 'lucide-react';
import { NO_YIELD_EMOJIS, getRandomEmoji } from '../constants/emojis';
import { DiceIcons } from './DiceIcons';
import { RESOURCE_META } from './uiConfig';
import { isValidPlayer } from '../utils/validation';

interface GameNotificationProps {
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
    const [isRolling, setIsRolling] = useState(false);

    const notification = G.notification;
    // We use a ref to track the "active" notification data to display even during exit animation
    // But since we control 'visible', we can just use G.notification.
    // Wait, if G.notification becomes null, we want to hide.
    // But if we want to fade out, we need the data to remain?
    // Current CSS 'animate-leave' handles opacity.
    // If we set visible=false, we still render the component but with 'animate-leave'?
    // Or we unmount?
    // The previous code: className={`${visible ? 'animate-enter' : 'animate-leave'} ...`}
    // So it stays mounted.
    // But if G.notification is null, we can't render content.
    // Solution: Keep a local state 'displayNotification' that updates only when notification is non-null.

    const [displayNotification, setDisplayNotification] = useState(notification);

    useEffect(() => {
        if (notification) {
            setDisplayNotification(notification);
            setVisible(true);

            const isProduction = notification.type === 'production';
            setIsRolling(isProduction);

            const timers: NodeJS.Timeout[] = [];
            if (isProduction) {
                timers.push(setTimeout(() => setIsRolling(false), 1000));
            }
            timers.push(setTimeout(() => setVisible(false), 5000));

            return () => {
                timers.forEach(clearTimeout);
            };
        } else {
            // If notification cleared (e.g. new roll started), hide immediately
            setVisible(false);
            setIsRolling(false);
        }
    }, [notification]);

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

    if (!displayNotification) return null;

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
        if (!isValidPlayer(evt.thief, G) || !isValidPlayer(evt.victim, G)) {
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
    const [d1, d2] = (displayNotification.type === 'production')
        ? G.lastRoll // Use G.lastRoll to match board state, or derive from event? Event has rollValue but not split d1/d2.
        // Actually, G.lastRoll is [d1, d2].
        // If event.rollValue != G.lastRoll sum, that would be weird.
        // We'll trust G.lastRoll as it's the source of truth for dice display.
        : [0, 0];

    const renderNotificationContent = () => {
        // The null check at the top of the component body ensures displayNotification is not null here.
        switch (displayNotification.type) {
            case 'production':
                return renderProductionContent(displayNotification);
            case 'robber':
                return renderRobberContent(displayNotification);
            default:
                // @ts-ignore
                const _exhaustiveCheck: never = displayNotification;
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
                    {displayNotification.type === 'production' ? (
                        isRolling ? (
                            <>
                                <Dices size={24} className="text-amber-400 animate-spin motion-reduce:animate-none" />
                                <span className="font-bold text-lg text-amber-400">Rolling...</span>
                            </>
                        ) : (
                            <DiceIcons d1={d1} d2={d2} size={20} className="text-amber-400" />
                        )
                    ) : (
                        <Ghost size={24} className="text-purple-400" />
                    )}
                </div>

                {/* Vertical Separator */}
                <div className="h-6 w-px bg-slate-600/50" />

                {/* Content Section */}
                {renderNotificationContent()}
            </div>
        </div>
    );
};
