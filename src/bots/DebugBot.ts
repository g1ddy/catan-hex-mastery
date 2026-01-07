import { RandomBot } from 'boardgame.io/ai';
import { GameState } from '../game/types';
import { STAGES } from '../game/constants';
import { Coach } from '../game/analysis/coach';
import { BotCoach, BotMove } from './BotCoach';

/**
 * Shared logic for enumerating moves using the BotCoach.
 * This is used by both the DebugBot (for local multiplayer fallback) and the GameClient (for SinglePlayer/Debug Panel).
 *
 * @param G The game state
 * @param ctx The game context (expected to contain the coach plugin, but handles missing case)
 * @param playerID The ID of the player to enumerate moves for
 * @param baseEnumerate Optional fallback function (e.g. RandomBot's enumerate) if no heuristic move is found
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const enumerateMoves = (G: GameState, ctx: any, playerID: string, baseEnumerate?: (...args: any[]) => any) => {
    const stage = ctx.activePlayers?.[playerID] || STAGES.ROLLING;

    // Use ctx.coach if available (Plugin), otherwise fall back to creating a transient instance
    let coach = ctx.coach as Coach;
    if (!coach) {
        console.warn('ctx.coach is undefined. Creating a transient Coach instance. This may be inefficient.');
        coach = new Coach(G);
    }

    const botCoach = new BotCoach(G, coach);
    let recommendation: BotMove | null = null;

    switch (stage) {
        case STAGES.PLACE_SETTLEMENT:
            recommendation = botCoach.recommendSettlementPlacement(playerID);
            break;
        case STAGES.PLACE_ROAD:
            recommendation = botCoach.recommendRoadPlacement(playerID);
            break;
        case STAGES.ROLLING:
            return [{ move: 'rollDice', args: [] }];
        case STAGES.ACTING:
            recommendation = botCoach.recommendNextMove(playerID);
            break;
    }

    if (recommendation) {
        return [recommendation];
    }

    // Fallback to provided base behavior (e.g. RandomBot)
    if (baseEnumerate) {
        return baseEnumerate(G, ctx, playerID);
    }

    return [];
};

export class DebugBot extends RandomBot {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _enumerate: ((...args: any[]) => any) | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor({ enumerate, ...args }: { enumerate: (...args: any[]) => any; [key: string]: any }) {
        // Pass enumerate to super to satisfy TS and base class requirements
        super({ enumerate: enumerate as any, ...args });
        this._enumerate = enumerate;
        // Delete the instance property created by RandomBot to expose our prototype method
        delete (this as any).enumerate;
    }

    enumerate(G: GameState, ctx: any, playerID: string) {
        return enumerateMoves(G, ctx, playerID, this._enumerate);
    }
}
