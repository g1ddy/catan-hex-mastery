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
        if (buildMode === 'settlement') return 'settlement';
        if (buildMode === 'city') return 'city';
        if (buildMode === 'road') return 'road';
    }

    return null;
};

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
        switch (mode) {
            case 'city': {
                const candidates = G.players[playerID]?.settlements || [];
                // Check if method exists (runtime safety)
                if (typeof coach.getBestCitySpots === 'function') {
                    return coach.getBestCitySpots(playerID, ctx, candidates);
                }
                break;
            }
            case 'road': {
                if (typeof coach.getBestRoadSpots === 'function') {
                    return coach.getBestRoadSpots(playerID, ctx);
                }
                break;
            }
            case 'settlement':
            default: {
                if (typeof coach.getAllSettlementScores === 'function') {
                    return coach.getAllSettlementScores(playerID, ctx);
                }
                break;
            }
        }
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
