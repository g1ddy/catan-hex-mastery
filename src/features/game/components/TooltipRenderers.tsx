import { BANK_TRADE_GIVE_AMOUNT, BANK_TRADE_RECEIVE_AMOUNT } from '../../../game/core/config';
import { ArrowRight, Zap, Gem, Layers, BarChart } from 'lucide-react';
import { Resources } from '../../../game/core/types';
import { RESOURCE_META } from '../../shared/config/uiConfig';
import { DiceIcons } from '../../shared/components/DiceIcons';
import { CoachRecommendation } from '../../../game/analysis/types';

interface TooltipProps {
  content: string | null;
}

type CostTooltipData = Partial<Resources>;

interface DiceTooltipData {
    d1: number;
    d2: number;
}

interface TradeTooltipData {
    give: string;
    receive: string;
    giveAmount?: number;
    receiveAmount?: number;
}

export const renderCostTooltip = ({ content }: TooltipProps) => {
  if (!content) return null;

  try {
    const cost = JSON.parse(content) as CostTooltipData;
    const hasCost = Object.values(cost).some((val) => typeof val === 'number' && val > 0);

    if (!hasCost) return null;

    return (
      <div className="flex gap-2">
        {RESOURCE_META.map(({ name, Icon, color }) => {
          // eslint-disable-next-line security/detect-object-injection
          const amount = cost[name];
          if (!amount) return null;
          return (
            <span key={name} className="flex items-center gap-1">
              <Icon className={color} size={16} />
              {amount}
            </span>
          );
        })}
      </div>
    );
  } catch (error) {
    console.error('Failed to parse tooltip content:', error);
    return null;
  }
};

export const renderDiceTooltip = ({ content }: TooltipProps) => {
    if (!content) return null;

    try {
        const parsed = JSON.parse(content) as DiceTooltipData;
        if (parsed && typeof parsed.d1 === 'number' && typeof parsed.d2 === 'number') {
            return <DiceIcons d1={parsed.d1} d2={parsed.d2} size={24} className="text-white" />;
        }
        return null;
    } catch (error) {
        console.error('Failed to parse dice tooltip content:', error);
        return null;
    }
};

export const renderTradeTooltip = ({ content }: TooltipProps) => {
    if (!content) return null;

    try {
        const parsed = JSON.parse(content) as TradeTooltipData;
        if (parsed && parsed.give && parsed.receive) {
            const giveMeta = RESOURCE_META.find(r => r.name === parsed.give);
            const receiveMeta = RESOURCE_META.find(r => r.name === parsed.receive);

            if (giveMeta && receiveMeta) {
                return (
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <span className="font-bold">{parsed.giveAmount || BANK_TRADE_GIVE_AMOUNT}</span>
                            <giveMeta.Icon className={giveMeta.color} size={16} />
                        </span>
                        <ArrowRight size={16} className="text-slate-400" />
                        <span className="flex items-center gap-1">
                            <span className="font-bold">{parsed.receiveAmount || BANK_TRADE_RECEIVE_AMOUNT}</span>
                            <receiveMeta.Icon className={receiveMeta.color} size={16} />
                        </span>
                    </div>
                );
            }
        }
    } catch (error) {
        // Ignore parsing errors, fall through to default return
        // We log it just to use the variable and satisfy strict configs if any
        if (process.env.NODE_ENV === 'development') {
             console.debug('Failed to parse trade tooltip:', error);
        }
    }

    // Default fallback for plain text or invalid JSON structure
    return <div>{content}</div>;
};

export const renderCoachTooltip = ({ content }: TooltipProps) => {
    if (!content) return null;

    try {
        const rec = JSON.parse(content) as CoachRecommendation;
        if (!rec || !rec.details) return <div>{content}</div>;

        return (
            <div className="flex flex-col gap-2 max-w-[200px]">
                <div className="font-bold text-amber-400 border-b border-slate-600 pb-1 mb-1">
                    {rec.reason}
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <BarChart size={14} className="text-blue-400" />
                    <span>Score: {rec.score.toFixed(1)}</span>
                    <span className="text-slate-400">({rec.details.pips} pips)</span>
                </div>

                {/* Bonuses */}
                <div className="flex flex-wrap gap-1">
                    {rec.details.scarcityBonus && (
                        <span className="flex items-center gap-1 text-xs bg-purple-900/50 text-purple-200 px-1.5 py-0.5 rounded border border-purple-700/50">
                            <Gem size={10} /> Scarcity
                        </span>
                    )}
                    {rec.details.diversityBonus && (
                        <span className="flex items-center gap-1 text-xs bg-green-900/50 text-green-200 px-1.5 py-0.5 rounded border border-green-700/50">
                            <Layers size={10} /> Diversity
                        </span>
                    )}
                    {rec.details.synergyBonus && (
                        <span className="flex items-center gap-1 text-xs bg-amber-900/50 text-amber-200 px-1.5 py-0.5 rounded border border-amber-700/50">
                            <Zap size={10} /> Synergy
                        </span>
                    )}
                </div>

                {/* Needed Resources */}
                {rec.details.neededResources && rec.details.neededResources.length > 0 && (
                     <div className="flex items-center gap-1 mt-1 pt-1 border-t border-slate-700/50">
                        <span className="text-xs text-slate-400">Needs:</span>
                        <div className="flex gap-1">
                            {rec.details.neededResources.map(r => {
                                const meta = RESOURCE_META.find(m => m.name === r);
                                if (!meta) return null;
                                return <meta.Icon key={r} size={12} className={meta.color} />;
                            })}
                        </div>
                     </div>
                )}
            </div>
        );
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.debug('Failed to parse coach tooltip content:', error, content);
        }
        return <div>{content}</div>;
    }
};
