import React, { useMemo, useState, useEffect } from 'react';
import { GameState, Resources } from '../game/types';
import {
    Trees, BrickWall, Wheat, Mountain, Cloud, Dices, Ghost, ArrowRight
} from 'lucide-react';
import { NO_YIELD_EMOJIS, getRandomEmoji } from '../constants/emojis';
import { DiceIcons } from './DiceIcons';
import { RESOURCE_META } from './uiConfig';

interface ProductionToastProps {
    G: GameState;
    visible: boolean;
    variant?: 'production' | 'robber';
}

const RESOURCE_ICONS: Record<keyof Resources, React.ReactNode> = {
    wood: <Trees size={14} className="text-green-500" />,
    brick: <BrickWall size={14} className="text-orange-500" />,
    wheat: <Wheat size={14} className="text-yellow-500" />,
    ore: <Mountain size={14} className="text-slate-400" />,
    sheep: <Cloud size={14} className="text-blue-300" />
};

export const ProductionToast: React.FC<ProductionToastProps> = ({ G, visible, variant = 'production' }) => {
    const [isRolling, setIsRolling] = useState(true);
    const rewards = G.lastRollRewards;
    const [d1Val, d2Val] = G.lastRoll;

    useEffect(() => {
        if (!visible || variant !== 'production') {
            setIsRolling(false);
            return;
        }

        setIsRolling(true);
        const timer = setTimeout(() => {
            setIsRolling(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, [visible, G.lastRoll, variant]); // Restart animation on new roll only for production

    const hasAnyResources = useMemo(() => {
        return Object.values(rewards).some(res =>
            Object.values(res).some(amount => amount > 0)
        );
    }, [rewards]);

    const randomEmoji = useMemo(() => {
        if (hasAnyResources) return null;
        return getRandomEmoji(NO_YIELD_EMOJIS);
    }, [hasAnyResources, G.lastRoll]);

    const renderProductionContent = () => (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 transition-opacity duration-300 ${isRolling ? 'opacity-0' : 'opacity-100'}`}>
            {!hasAnyResources ? (
                <div className="text-2xl animate-pulse motion-reduce:animate-none" role="img" aria-label="No resources">
                    {randomEmoji}
                </div>
            ) : (
                Object.entries(rewards).map(([pid, res]) => {
                    const player = G.players[pid];
                    const hasResources = Object.values(res).some(v => v > 0);

                    if (!player || !hasResources) return null;

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

    const renderRobberContent = () => {
        const steal = G.lastSteal;
        if (!steal) return null;

        // eslint-disable-next-line security/detect-object-injection
        const thief = G.players[steal.thief];
        // eslint-disable-next-line security/detect-object-injection
        const victim = G.players[steal.victim];

        if (!thief || !victim) return null;

        const resourceMeta = steal.resource ? RESOURCE_META.find(r => r.name === steal.resource) : null;

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

    return (
        <div
            role="status"
            aria-live="polite"
            className={`${visible ? 'animate-enter' : 'animate-leave'} w-fit max-w-[90vw] bg-slate-800/90 backdrop-blur shadow-lg rounded-full pointer-events-auto ring-1 ring-white/10 px-4 py-2`}
        >
            <div className="flex items-center gap-4 text-slate-100">
                {/* Icon Section */}
                <div className="flex items-center gap-2">
                    {variant === 'production' ? (
                        isRolling ? (
                            <>
                                <Dices size={24} className="text-amber-400 animate-spin motion-reduce:animate-none" />
                                <span className="font-bold text-lg text-amber-400">Rolling...</span>
                            </>
                        ) : (
                            <DiceIcons d1={d1Val} d2={d2Val} size={20} className="text-amber-400" />
                        )
                    ) : (
                        <Ghost size={24} className="text-purple-400" />
                    )}
                </div>

                {/* Vertical Separator */}
                <div className="h-6 w-px bg-slate-600/50" />

                {/* Content Section */}
                {variant === 'production' ? renderProductionContent() : renderRobberContent()}
            </div>
        </div>
    );
};
