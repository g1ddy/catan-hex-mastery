import { CoachRecommendation } from '../../game/analysis/coach';

export interface CoachData {
    recommendations: Map<string, CoachRecommendation>;
    minScore: number;
    maxScore: number;
    top3Set: Set<string>;
}

export const EMPTY_COACH_DATA: CoachData = {
    recommendations: new Map(),
    minScore: 0,
    maxScore: 0,
    top3Set: new Set<string>()
};
