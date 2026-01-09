export interface BotProfile {
    name: string;
    description: string;

    // Weights for actions (higher = more likely/preferred)
    weights: {
        buildCity: number;
        buildSettlement: number;
        buildRoad: number;
        buyDevCard: number;
    };

    // Strategic Preferences
    expansion: {
        // How much does it value blocking others? (0-1)
        aggressiveness: number;
        // How much does it value resource diversity vs maximization? (0-1, 1=diversity)
        diversityPreference: number;
    };
}

export const BALANCED_PROFILE: BotProfile = {
    name: "Balanced",
    description: "A balanced bot that prioritizes Cities and Settlements but builds Roads when needed.",
    weights: {
        buildCity: 100,
        buildSettlement: 80,
        buildRoad: 40,
        buyDevCard: 30
    },
    expansion: {
        aggressiveness: 0.3,
        diversityPreference: 0.6
    }
};

export const AGGRESSIVE_PROFILE: BotProfile = {
    name: "Aggressive",
    description: "Prioritizes expansion and cutting off opponents.",
    weights: {
        buildCity: 80,
        buildSettlement: 90,
        buildRoad: 70, // Higher priority on roads
        buyDevCard: 20
    },
    expansion: {
        aggressiveness: 0.8,
        diversityPreference: 0.4
    }
};
