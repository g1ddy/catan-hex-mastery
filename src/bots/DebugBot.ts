import { RandomBot } from 'boardgame.io/ai';
import { GameState } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { BotCoach } from './BotCoach';

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enumerate(G: GameState, ctx: any, playerID: string): any[] {
        // 1. Get ALL valid moves from the base enumerator (injected from Game.ai.enumerate)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let allMoves: any[] = [];
        if (this._enumerate) {
             allMoves = this._enumerate(G, ctx, playerID);
        }

        if (!allMoves || allMoves.length === 0) {
            return [];
        }

        // 2. Use BotCoach to filter/rank these moves
        // Use ctx.coach if available (Plugin), otherwise fall back to creating a transient instance
        let coach = ctx.coach;
        if (!coach) {
            // console.warn('ctx.coach is undefined. Creating a transient Coach instance.');
            coach = new Coach(G);
        }

        const botCoach = new BotCoach(G, coach);
        const bestMoves = botCoach.filterOptimalMoves(allMoves, playerID);

        // 3. Return the best moves.
        // Since ai.enumerate now returns standard { move, args } objects,
        // we can simply return them without conversion.
        const movesToConsider = bestMoves.length > 0 ? bestMoves : allMoves;

        return movesToConsider;
    }
}
