import { Resources } from '../types';
import { BUILD_COSTS } from '../config';

export type BuildType = keyof typeof BUILD_COSTS;

export const canAfford = (resources: Resources, cost: Partial<Resources>): boolean => {
    return (Object.keys(cost) as Array<keyof Resources>).every(
        resource => resources[resource] >= (cost[resource] || 0)
    );
};

export const getAffordableBuilds = (resources: Resources): Record<BuildType, boolean> => {
    return {
        road: canAfford(resources, BUILD_COSTS.road),
        settlement: canAfford(resources, BUILD_COSTS.settlement),
        city: canAfford(resources, BUILD_COSTS.city),
        devCard: canAfford(resources, BUILD_COSTS.devCard)
    };
};
