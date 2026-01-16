import { BANK_TRADE_GIVE_AMOUNT } from '../config';
import { Resources } from '../types';

export const RESOURCE_ORDER: (keyof Resources)[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

export interface TradeResult {
    give: keyof Resources;
    receive: keyof Resources;
    canTrade: boolean;
}

/**
 * Calculates the best trade based on the "Most for Least" rule.
 * Tie-breaking: Uses fixed order (Wood, Brick, Sheep, Wheat, Ore).
 */
export const calculateTrade = (resources: Resources): TradeResult => {
    // eslint-disable-next-line security/detect-object-injection
    const resourceValues = RESOURCE_ORDER.map(res => resources[res]);
    const maxVal = Math.max(...resourceValues);
    const minVal = Math.min(...resourceValues);

    // Find the first resource matching the max/min value to respect the tie-breaking rule.
    // The ! assertion is safe because we just derived maxVal/minVal from the same list.
    // eslint-disable-next-line security/detect-object-injection
    const maxRes = RESOURCE_ORDER.find(res => resources[res] === maxVal)!;
    // eslint-disable-next-line security/detect-object-injection
    const minRes = RESOURCE_ORDER.find(res => resources[res] === minVal)!;

    return {
        give: maxRes,
        receive: minRes,
        canTrade: maxVal >= BANK_TRADE_GIVE_AMOUNT
    };
};
