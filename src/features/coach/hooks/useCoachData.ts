import React from 'react';
import { GameState } from '../../../game/core/types';
import { CoachRecommendation, Coach, CoachCtx } from '../../../game/analysis/coach';
import { PHASES } from '../../../game/core/constants';
import { BuildMode, UiMode } from '../../shared/types';
import { Ctx } from 'boardgame.io';

export interface CoachData {
    recommendations: Map<string, CoachRecommendation>;
    minScore: number;
    maxScore: number;
    top3Set: Set<string>;
}

const EMPTY_COACH_DATA: CoachData = { recommendations: new Map(), minScore: 0, maxScore: 0, top3Set: new Set<string>() };

export const useCoachData = (
    G: GameState,
    ctx: Ctx,
    buildMode: BuildMode,
    uiMode: UiMode,
    isCoachModeEnabled: boolean
): CoachData => {
    const currentPlayerSettlements = G.players[ctx.currentPlayer]?.settlements;

    return React.useMemo(() => {
        if (!isCoachModeEnabled) {
            return EMPTY_COACH_DATA;
        }

        // Active when placing settlement in Setup OR Gameplay, OR City in Gameplay
        const isSetupPlacing = ctx.phase === PHASES.SETUP && uiMode === 'placing';
        const isGameSettlement = (ctx.phase === PHASES.GAMEPLAY) && buildMode === 'settlement';
        const isGameCity = (ctx.phase === PHASES.GAMEPLAY) && buildMode === 'city';

        if (!isSetupPlacing && !isGameSettlement && !isGameCity) {
            return EMPTY_COACH_DATA;
        }

        // Use ctx.coach if available (Plugin), otherwise fall back to creating a transient instance
        const coach = (ctx as CoachCtx).coach;
        if (!coach) {
            console.warn('Coach plugin not found in ctx, falling back to transient Coach instance');
        }
        const coachInstance = coach || new Coach(G);

        let allScores: CoachRecommendation[] = [];

        if (isGameCity) {
            const candidates = G.players[ctx.currentPlayer]?.settlements || [];
            if (typeof coachInstance.getBestCitySpots === 'function') {
                allScores = coachInstance.getBestCitySpots(ctx.currentPlayer, ctx, candidates);
            }
        } else {
            if (typeof coachInstance.getAllSettlementScores === 'function') {
                allScores = coachInstance.getAllSettlementScores(ctx.currentPlayer, ctx);
            }
        }

        if (allScores.length === 0) {
            return EMPTY_COACH_DATA;
        }

        const vals = allScores.map(s => s.score);
        const sorted = [...allScores].sort((a, b) => b.score - a.score);
        const top3Ids = sorted.slice(0, 3).map(s => s.vertexId);

        // Convert to Map for O(1) Lookup
        const recMap = new Map(allScores.map(rec => [rec.vertexId, rec]));

        return {
            recommendations: recMap,
            minScore: Math.min(...vals),
            maxScore: Math.max(...vals),
            top3Set: new Set(top3Ids)
        };
    }, [G, ctx, isCoachModeEnabled, buildMode, uiMode, currentPlayerSettlements]);
};
