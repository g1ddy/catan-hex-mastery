import React from 'react';
import { CoachData } from '../../coach/hooks/useCoachData';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const renderTooltipContent = (coachData: CoachData) => ({ content }: { content: string | null; activeAnchor: HTMLElement | null }): React.ReactNode => {
    if (!content) return null;
    const rec = coachData.recommendations.get(content);
    if (!rec) return null;

    const { score, details, reason } = rec;
    const parts = [];
    // Pips
    parts.push(details.pips >= 10 ? 'High Pips' : `${details.pips} Pips`);
    // Scarcity
    if (details.scarcityBonus && details.scarceResources.length > 0) {
        parts.push(`Rare ${details.scarceResources.map(capitalize).join('/')}`);
    }
    // Diversity
    if (details.diversityBonus) {
        parts.push('High Diversity');
    }
    // Synergy
    if (details.synergyBonus) {
        parts.push('Synergy');
    }
    // Needed
    if (details.neededResources.length > 0) {
        parts.push(`Missing ${details.neededResources.map(capitalize).join('/')}`);
    }

    // Fallback to reason string if we have no meaningful details (e.g. for Roads)
    if (parts.length === 1 && parts[0] === '0 Pips' && reason) {
        return (
            <div>
                <div className="font-bold mb-1">Score: {score}</div>
                <div className="text-xs text-slate-300">{reason}</div>
            </div>
        );
    }

    return (
        <div>
            <div className="font-bold mb-1">Score: {score}</div>
            <div className="text-xs text-slate-300">{parts.join(' + ')}</div>
        </div>
    );
};
