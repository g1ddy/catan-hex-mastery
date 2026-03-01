import { Ctx } from 'boardgame.io';
import { GameState, GameAction, BotMove } from '../game/core/types';
import { Coach } from '../game/analysis/coach';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';
import { MoveScorer } from './logic/MoveScorer';
import { OptimalMoveFilter } from './logic/OptimalMoveFilter';

export type { BotMove };

export class BotCoach {
    // Bot logic using Coach recommendations
    private filter: OptimalMoveFilter;

    constructor(G: GameState, coach: Coach, profile: BotProfile = BALANCED_PROFILE) {
        const scorer = new MoveScorer();
        this.filter = new OptimalMoveFilter(G, coach, profile, scorer);
    }

    /**
     * Filters and sorts a list of available moves to find the "optimal" ones.
     * @param allMoves The full list of legal moves (e.g. from ai.enumerate)
     * @param playerID The player ID
     * @param ctx The boardgame.io context object
     * @returns A sorted list of optimal moves (best first)
     */
    public filterOptimalMoves(allMoves: GameAction[], playerID: string, ctx: Ctx): GameAction[] {
        return this.filter.filterOptimalMoves(allMoves, playerID, ctx);
    }
}
