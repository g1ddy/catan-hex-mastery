import { BANK_TRADE_GIVE_AMOUNT, BANK_TRADE_RECEIVE_AMOUNT } from '../../../game/core/config';
import { ArrowRight } from 'lucide-react';
import { Resources } from '../../../game/core/types';
import { RESOURCE_META } from '../../shared/config/uiConfig';
import { DiceIcons } from '../../shared/components/DiceIcons';

interface TooltipProps {
  content: string | null;
}

interface CostTooltipData extends Partial<Resources> {}

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
