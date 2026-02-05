export interface CoachRecommendation {
    vertexId?: string;
    edgeId?: string;
    score: number;
    reason: string;
    details: {
        pips: number;
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
