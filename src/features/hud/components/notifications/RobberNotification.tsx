import React from 'react';
import { RobberEvent, Player } from '../../../../game/core/types';
import { safeGet } from '../../../../game/core/utils/objectUtils';
import { ArrowRight } from 'lucide-react';
import { RESOURCE_META } from '../../../shared/config/uiConfig';

interface RobberNotificationProps {
    evt: RobberEvent;
    players: Record<string, Player>;
}

export const RobberNotification: React.FC<RobberNotificationProps> = ({ evt, players }) => {
    // Validate players exist
    const thief = safeGet(players, evt.thief);
    const victim = safeGet(players, evt.victim);

    if (evt.thief === evt.victim || !thief || !victim) {
        return null;
    }

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
