import React from 'react';
import { CoachData } from '../../coach/hooks/useCoachData';
import { GameState } from '../../../game/core/types';
import { safeCheck } from '../../../game/core/utils/objectUtils';
import { BarChart, Gem, Layers, Zap } from 'lucide-react';
import { RESOURCE_META } from '../../shared/config/uiConfig';

export const getPrimaryHexOwner = (parts: string[], G: GameState): string => {
    return parts.find(ownerId => safeCheck(G.board.hexes, ownerId)) || parts[0] || '';
};

export const renderTooltipContent = (coachData: CoachData) => ({ content }: { content: string | null; activeAnchor: HTMLElement | null }): React.ReactNode => {
    if (!content) return null;
    const rec = coachData.recommendations.get(content);
    if (!rec || !rec.details) return <div>{content}</div>;

    const { score, details, reason } = rec;

    return (
        <div className="flex flex-col gap-2 max-w-[200px]">
            <div className="font-bold text-amber-400 border-b border-slate-600 pb-1 mb-1">
                {reason}
            </div>

            <div className="flex items-center gap-2 text-sm">
                <BarChart size={14} className="text-blue-400" />
                <span>Score: {score.toFixed(1)}</span>
                <span className="text-slate-400">({details.pips} pips)</span>
            </div>

            {/* Bonuses */}
            <div className="flex flex-wrap gap-1">
                {details.scarcityBonus && (
                    <span className="flex items-center gap-1 text-xs bg-purple-900/50 text-purple-200 px-1.5 py-0.5 rounded border border-purple-700/50">
                        <Gem size={10} /> Scarcity
                    </span>
                )}
                {details.diversityBonus && (
                    <span className="flex items-center gap-1 text-xs bg-green-900/50 text-green-200 px-1.5 py-0.5 rounded border border-green-700/50">
                        <Layers size={10} /> Diversity
                    </span>
                )}
                {details.synergyBonus && (
                    <span className="flex items-center gap-1 text-xs bg-amber-900/50 text-amber-200 px-1.5 py-0.5 rounded border border-amber-700/50">
                        <Zap size={10} /> Synergy
                    </span>
                )}
            </div>

            {/* Needed Resources */}
            {details.neededResources.length > 0 && (
                 <div className="flex items-center gap-1 mt-1 pt-1 border-t border-slate-700/50">
                    <span className="text-xs text-slate-400">Needs:</span>
                    <div className="flex gap-1">
                        {details.neededResources.map(r => {
                            const meta = RESOURCE_META.find(m => m.name === r);
                            if (!meta) return null;
                            const Icon = meta.Icon;
                            return <Icon key={r} size={12} className={meta.color} />;
                        })}
                    </div>
                 </div>
            )}
        </div>
    );
};
