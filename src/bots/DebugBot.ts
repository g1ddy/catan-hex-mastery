import { RandomBot } from 'boardgame.io/ai';
import { GameState } from '../game/types';
import { STAGES } from '../game/constants';
import { Coach } from '../game/analysis/coach';

export class DebugBot extends RandomBot {
    private _enumerate: Function;

    constructor({ enumerate, ...args }: any) {
        super({ enumerate, ...args });
        this._enumerate = enumerate;
    }

    enumerate(G: GameState, ctx: any, playerID: string) {
        const stage = ctx.activePlayers?.[playerID] || STAGES.ROLLING;

        // Setup Phase - Settlements
        if (stage === STAGES.PLACE_SETTLEMENT) {
            const recommendation = (ctx.coach as Coach).recommendSettlementPlacement(playerID);
            if (recommendation) {
                return [recommendation];
            }
        }

        // Setup Phase - Roads
        if (stage === STAGES.PLACE_ROAD) {
            const recommendation = (ctx.coach as Coach).recommendRoadPlacement(playerID);
            if (recommendation) {
                 return [recommendation];
            }
        }

        // Gameplay Phase - Rolling
        if (stage === STAGES.ROLLING) {
            return [{ move: 'rollDice' }];
        }

        // Gameplay Phase - Acting (Greedy Build)
        if (stage === STAGES.ACTING) {
            const recommendation = (ctx.coach as Coach).recommendNextMove(playerID);
            if (recommendation) {
                return [recommendation];
            }
        }

        // Fallback to RandomBot behavior (which usually calls the passed enumerate or generic one)
        // Since RandomBot.enumerate isn't easily super-callable if we fully override without access to its internals,
        // we'll rely on the default enumerate passed in constructor if we want full random fallback,
        // OR we return empty array to say "no idea" and let framework handle it?
        // Actually, RandomBot implementations usually need us to return array of moves.

        // If we are here, Coach had no specific recommendation or we are in an unhandled state.
        // We should just return what the generic enumerator finds.
        // Note: The `enumerate` passed to constructor is typically the framework's "list all valid moves".
        // The `super.enumerate` in `boardgame.io/ai` might not be exposed as we expect.
        // But `RandomBot` IS the MCTS/AI interface.
        // Actually, `RandomBot` is a class that implements `enumerate`.

        // If we want to fallback to "random valid move", we need the list of all valid moves.
        // This is usually provided by the `enumerate` argument passed to the bot constructor,
        // BUT `RandomBot` doesn't store it publicly.

        // However, standard `boardgame.io` bots receive `enumerate` as an argument.
        // To be safe and since this is a "DebugBot", let's assume if Coach fails, we just want ANY valid move.
        // But we don't have easy access to "all valid moves" without the framework's enumerator.

        // WORKAROUND: We will return [] and let the system deal with it, OR better:
        // We will assume `Coach` covers all "must do" logic.
        // For Random fallback, we need to invoke the original enumerator.
        // `RandomBot` stores the enumerator. Let's try to use it if accessible, otherwise we might be stuck.

        // Actually, looking at `boardgame.io` source, `RandomBot` just calls `enumerate`.
        // If we override it, we lose the default behavior unless we call it.
        // But we don't have the `enumerate` function here unless we saved it.

        // Let's modify the constructor to save the enumerator.
        return (this as any)._enumerate(G, ctx, playerID);
    }
}
