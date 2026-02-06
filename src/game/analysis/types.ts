export interface CoachRecommendation {
    vertexId?: string;
    edgeId?: string;
    score: number;
    reason: string;
    details: {
        pips: number;
        distance?: number; // Added for Road Analysis
        rawScore?: number; // Added for Road Analysis
        scarcityBonus: boolean;
        scarceResources: string[];
        diversityBonus: boolean;
        synergyBonus: boolean;
        neededResources: string[];
    };
}

export interface AnalysisProfile {
    expansion: {
        aggressiveness: number;
        diversityPreference?: number;
    };
}
