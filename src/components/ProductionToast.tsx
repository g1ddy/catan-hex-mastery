import React from 'react';
import { GameState, Resources } from '../game/types';
import { Trees, BrickWall, Wheat, Mountain, Cloud } from 'lucide-react';

interface ProductionToastProps {
    G: GameState;
    sum: number;
    visible: boolean;
}

const RESOURCE_ICONS: Record<keyof Resources, React.ReactNode> = {
    wood: <Trees size={14} className="text-green-500" />,
    brick: <BrickWall size={14} className="text-orange-500" />,
    wheat: <Wheat size={14} className="text-yellow-500" />,
    ore: <Mountain size={14} className="text-slate-400" />,
    sheep: <Cloud size={14} className="text-blue-300" />
};

export const ProductionToast: React.FC<ProductionToastProps> = ({ G, sum, visible }) => {
    const rewards = G.lastRollRewards;

    return (
        <div className={`${visible ? 'animate-enter' : 'animate-leave'} w-fit max-w-[90vw] bg-slate-800/90 backdrop-blur shadow-lg rounded-full pointer-events-auto ring-1 ring-white/10 px-4 py-2`}>
            <div className="flex items-center gap-4 text-slate-100">
                {/* Roll Number */}
                <div className="font-bold text-lg whitespace-nowrap text-amber-400">
                    Roll: {sum}
                </div>

                {/* Vertical Separator */}
                <div className="h-6 w-px bg-slate-600/50" />

                {/* Players & Resources */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {Object.entries(rewards).map(([pid, res]) => {
                        const playerColor = G.players[pid].color;
                        const hasResources = Object.values(res).some(v => v > 0);

                        if (!hasResources) return null;

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
                                                +{amount} {RESOURCE_ICONS[type as keyof Resources]}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
