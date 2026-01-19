import React from 'react';
import { GameState } from '../game/types';
import { Ghost, ArrowRight } from 'lucide-react';
import { RESOURCE_META } from './uiConfig';

interface RobberToastProps {
    G: GameState;
    visible: boolean;
}

export const RobberToast: React.FC<RobberToastProps> = ({ G, visible }) => {
    const steal = G.lastSteal;

    if (!steal) return null;

    // eslint-disable-next-line security/detect-object-injection
    const thief = G.players[steal.thief];
    // eslint-disable-next-line security/detect-object-injection
    const victim = G.players[steal.victim];

    // Find resource meta
    const resourceMeta = steal.resource ? RESOURCE_META.find(r => r.name === steal.resource) : null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`${visible ? 'animate-enter' : 'animate-leave'} w-fit max-w-[90vw] bg-slate-800/90 backdrop-blur shadow-lg rounded-full pointer-events-auto ring-1 ring-white/10 px-4 py-2`}
        >
            <div className="flex items-center gap-4 text-slate-100">
                {/* Ghost Icon */}
                <div className="flex items-center gap-2">
                     <Ghost size={24} className="text-purple-400" />
                </div>

                {/* Vertical Separator */}
                <div className="h-6 w-px bg-slate-600/50" />

                {/* Steal Details */}
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
            </div>
        </div>
    );
};
