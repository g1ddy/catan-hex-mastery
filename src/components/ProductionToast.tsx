import React from 'react';
import { GameState, Resources } from '../game/types';
import { Trees, BrickWall, Wheat, Mountain, Cloud } from 'lucide-react';

interface ProductionToastProps {
    G: GameState;
    sum: number;
    visible: boolean;
}

const RESOURCE_ICONS: Record<keyof Resources, React.ReactNode> = {
    wood: <Trees size={16} className="text-green-700" />,
    brick: <BrickWall size={16} className="text-red-700" />,
    wheat: <Wheat size={16} className="text-yellow-600" />,
    ore: <Mountain size={16} className="text-slate-600" />,
    sheep: <Cloud size={16} className="text-blue-300" />
};

export const ProductionToast: React.FC<ProductionToastProps> = ({ G, sum, visible }) => {
    const rewards = G.lastRollRewards;

    return (
        <div className={`${visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-slate-800 shadow-lg rounded-lg pointer-events-auto flex flex-col ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-slate-100">
                            Production (Roll: {sum})
                        </p>
                        <div className="mt-1 text-sm text-slate-300">
                            {Object.entries(rewards).map(([pid, res]) => {
                                const playerColor = G.players[pid].color;
                                return (
                                    <div key={pid} className="flex items-center gap-2 mt-1">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: playerColor }} />
                                        <span className="font-bold">Player {Number(pid) + 1}:</span>
                                        <div className="flex gap-2">
                                            {Object.entries(res).map(([type, amount]) => {
                                                if (!amount) return null;
                                                return (
                                                    <span key={type} className="flex items-center gap-0.5 bg-slate-700 px-1.5 rounded text-xs">
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
            </div>
        </div>
    );
};
