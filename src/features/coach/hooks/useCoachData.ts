import React from 'react';
import { GameState } from '../../../game/core/types';
import { Coach, CoachCtx } from '../../../game/analysis/coach';
import { BuildMode, UiMode } from '../../shared/types';
import { Ctx } from 'boardgame.io';
import { CoachData, EMPTY_COACH_DATA } from '../types';
import { getCoachMode, fetchRecommendations, processRecommendations } from '../logic/coachUtils';

// Export CoachData to maintain backward compatibility if other files import it from here
export type { CoachData };

export const useCoachData = (
    G: GameState,
    ctx: Ctx,
    buildMode: BuildMode,
    uiMode: UiMode,
    isCoachModeEnabled: boolean,
    playerID: string | null // Added playerID to ensure security
): CoachData => {
    // We only depend on the relevant parts of G to prevent unnecessary re-runs
    const currentPlayerSettlements = G.players[ctx.currentPlayer]?.settlements;
    const activeStage = ctx.activePlayers?.[ctx.currentPlayer];

    return React.useMemo(() => {
        if (!isCoachModeEnabled) {
            return EMPTY_COACH_DATA;
        }

        // 1. Determine Mode
        const mode = getCoachMode(ctx, uiMode, buildMode);
        if (!mode) {
            return EMPTY_COACH_DATA;
        }

        // 2. Get Coach Instance
        // Use ctx.coach if available (Plugin), otherwise fall back to transient instance
        const coach = (ctx as CoachCtx).coach || new Coach(G);
        if (!(ctx as CoachCtx).coach) {
            // Only warn if we really expected a plugin but didn't find one.
            // However, often Coach is just transient.
            // console.warn('Coach plugin not found in ctx, falling back to transient Coach instance');
        }

        // 3. Fetch Recommendations (Pass playerID for security check)
        const allScores = fetchRecommendations(coach, mode, G, ctx, playerID);

        // 4. Process & Return
        return processRecommendations(allScores);

    }, [G, ctx, isCoachModeEnabled, buildMode, uiMode, currentPlayerSettlements, activeStage, playerID]);
};
