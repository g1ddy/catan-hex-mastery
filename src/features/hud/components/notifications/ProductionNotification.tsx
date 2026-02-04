import React, { useMemo } from 'react';
import { ProductionEvent, Resources, Player } from '../../../../game/core/types';
import { safeGet } from '../../../../game/core/utils/objectUtils';
import { Trees, BrickWall, Wheat, Mountain, Cloud } from 'lucide-react';
import { NO_YIELD_EMOJIS, getRandomEmoji } from '../constants/emojis';

interface ProductionNotificationProps {
    evt: ProductionEvent;
    players: Record<string, Player>;
    isRolling: boolean;
}

const RESOURCE_ICONS: Record<keyof Resources, React.ReactNode> = {
    wood: <Trees size={14} className="text-green-500" />,
    brick: <BrickWall size={14} className="text-orange-500" />,
    wheat: <Wheat size={14} className="text-yellow-500" />,
    ore: <Mountain size={14} className="text-slate-400" />,
    sheep: <Cloud size={14} className="text-blue-300" />
};

export const ProductionNotification: React.FC<ProductionNotificationProps> = ({ evt, players, isRolling }) => {
    const hasAnyResources = useMemo(() => {
        return Object.values(evt.rewards).some(res =>
            Object.values(res).some(amount => (amount || 0) > 0)
        );
    }, [evt]);

    const randomEmoji = useMemo(() => {
        if (hasAnyResources) return null;
        return getRandomEmoji(NO_YIELD_EMOJIS);
    }, [hasAnyResources, evt]);

    return (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 transition-opacity duration-300 ${isRolling ? 'opacity-0' : 'opacity-100'}`}>
            {!hasAnyResources ? (
                <div className="text-2xl animate-pulse motion-reduce:animate-none" role="img" aria-label="No resources">
                    {randomEmoji}
                </div>
            ) : (
                Object.entries(evt.rewards).map(([pid, res]) => {
                    const player = safeGet(players, pid);
                    if (!player) return null;

                    const hasResources = Object.values(res).some(v => (v || 0) > 0);
                    if (!hasResources) return null;

                    return (
                        <div key={pid} className="flex items-center gap-2 bg-slate-700/50 rounded-full px-2 py-0.5">
                            {/* Player Dot */}
                            <div
                                className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                                style={{ backgroundColor: player.color }}
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
};
