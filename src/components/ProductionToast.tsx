import React, { useMemo, useState, useEffect } from 'react';
import { GameState, Resources } from '../game/types';
import {
    Trees, BrickWall, Wheat, Mountain, Cloud,
    Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Dices, LucideIcon
} from 'lucide-react';
import { NO_YIELD_EMOJIS, getRandomEmoji } from '../constants/emojis';

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

const DICE_ICONS: Record<number, LucideIcon> = {
    1: Dice1,
    2: Dice2,
    3: Dice3,
    4: Dice4,
    5: Dice5,
    6: Dice6
};

export const ProductionToast: React.FC<ProductionToastProps> = ({ G, sum, visible }) => {
    const [isRolling, setIsRolling] = useState(true);
    const rewards = G.lastRollRewards;
    const [d1Val, d2Val] = G.lastRoll;

    useEffect(() => {
        if (visible) {
            setIsRolling(true);
            const timer = setTimeout(() => {
                setIsRolling(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [visible, G.lastRoll]); // Restart animation on new roll

    const hasAnyResources = useMemo(() => {
        return Object.values(rewards).some(res =>
            Object.values(res).some(amount => amount > 0)
        );
    }, [rewards]);

    const randomEmoji = useMemo(() => {
        if (hasAnyResources) return null;
        return getRandomEmoji(NO_YIELD_EMOJIS);
    }, [hasAnyResources, G.lastRoll]);

    const Die1Icon = DICE_ICONS[d1Val] || Dices;
    const Die2Icon = DICE_ICONS[d2Val] || Dices;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`${visible ? 'animate-enter' : 'animate-leave'} w-fit max-w-[90vw] bg-slate-800/90 backdrop-blur shadow-lg rounded-full pointer-events-auto ring-1 ring-white/10 px-4 py-2`}
        >
            <div className="flex items-center gap-4 text-slate-100">
                {/* Roll Dice Section */}
                <div className="flex items-center gap-2">
                    {isRolling ? (
                        <>
                            <Dices size={24} className="text-amber-400 animate-spin motion-reduce:animate-none" />
                            <span className="font-bold text-lg text-amber-400">Rolling...</span>
                        </>
                    ) : (
                        <>
                            <div className="flex gap-1">
                                <Die1Icon size={20} className="text-amber-400" />
                                <Die2Icon size={20} className="text-amber-400" />
                            </div>
                            <span className="font-bold text-lg text-amber-400 ml-1">
                                = {sum}
                            </span>
                        </>
                    )}
                </div>

                {/* Vertical Separator */}
                <div className="h-6 w-px bg-slate-600/50" />

                {/* Players & Resources or Emoji - Only show after rolling */}
                <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 transition-opacity duration-300 ${isRolling ? 'opacity-0' : 'opacity-100'}`}>
                    {!hasAnyResources ? (
                        <div className="text-2xl animate-pulse motion-reduce:animate-none" role="img" aria-label="No resources">
                            {randomEmoji}
                        </div>
                    ) : (
                        Object.entries(rewards).map(([pid, res]) => {
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
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
