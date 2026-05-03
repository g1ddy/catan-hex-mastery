import { Coach, CoachRecommendation } from '../../../game/analysis/coach';
import { GameState } from '../../../game/core/types';
import { PHASES, STAGES } from '../../../game/core/constants';
import { BuildMode, UiMode } from '../../shared/types';
import { Ctx } from 'boardgame.io';
import { CoachData, EMPTY_COACH_DATA } from '../types';

export type CoachMode = 'settlement' | 'city' | 'road' | null;

/**
 * Determines the current mode for coach recommendations based on game state.
 */
export const getCoachMode = (
    ctx: Ctx,
    uiMode: UiMode,
    buildMode: BuildMode
): CoachMode => {
    const currentStage = ctx.activePlayers?.[ctx.currentPlayer];

    // Setup Phase
    if (ctx.phase === PHASES.SETUP && uiMode === 'placing') {
        if (currentStage === STAGES.PLACE_SETTLEMENT) return 'settlement';
        if (currentStage === STAGES.PLACE_ROAD) return 'road';
    }

    // Gameplay Phase
    if (ctx.phase === PHASES.GAMEPLAY) {
        return buildMode;
    }

    return null;
};

function executeCoachMethod(coach: Coach, mode: CoachMode, playerID: string, ctx: Ctx, G: GameState) {
    if (mode === 'city' && typeof coach.getBestCitySpots === 'function') {
        const candidates = G.players[playerID]?.settlements || [];
        return coach.getBestCitySpots(playerID, ctx, candidates);
    }
    if (mode === 'road' && typeof coach.getBestRoadSpots === 'function') {
        return coach.getBestRoadSpots(playerID, ctx);
    }
    if ((mode === 'settlement' || !mode) && typeof coach.getAllSettlementScores === 'function') {
        return coach.getAllSettlementScores(playerID, ctx);
    }
    return [];
}

/**
 * Fetches raw recommendations from the Coach instance based on the mode.
 * Securely checks that the requesting player is the current player.
 */
export const fetchRecommendations = (
    coach: Coach,
    mode: CoachMode,
    G: GameState,
    ctx: Ctx,
    requestingPlayerID: string | null
): CoachRecommendation[] => {
    if (!mode) return [];

    // Security Check: Only allow recommendations if it's the player's turn
    if (requestingPlayerID !== ctx.currentPlayer) {
        return [];
    }

    const playerID = ctx.currentPlayer;

    try {
        return executeCoachMethod(coach, mode, playerID, ctx, G);
    } catch (e) {
        console.error('Error fetching coach recommendations:', e);
    }

    return [];
};

/**
 * Processes raw recommendations into a structured CoachData object.
 */
export const processRecommendations = (
    allScores: CoachRecommendation[]
): CoachData => {
    if (!allScores || allScores.length === 0) {
        return EMPTY_COACH_DATA;
    }

    const vals = allScores.map(s => s.score);
    const sorted = [...allScores].sort((a, b) => b.score - a.score);

    // Identify top 3 based on ID (could be vertex or edge)
    const top3Ids = sorted.slice(0, 3)
        .map(s => s.edgeId || s.vertexId || '')
        .filter(Boolean);

    // Convert to Map for O(1) Lookup
    // We prioritize edgeId if available, otherwise vertexId
    const recMap = new Map<string, CoachRecommendation>();
    allScores.forEach(rec => {
        const id = rec.edgeId || rec.vertexId;
        if (id) {
            recMap.set(id, rec);
        }
    });

    return {
        recommendations: recMap,
        minScore: Math.min(...vals),
        maxScore: Math.max(...vals),
        top3Set: new Set(top3Ids)
    };
};
