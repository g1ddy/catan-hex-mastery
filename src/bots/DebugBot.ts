import { RandomBot } from 'boardgame.io/ai';
import { GameState } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { BotCoach } from './BotCoach';

export class DebugBot extends RandomBot {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor({ enumerate, ...args }: { enumerate: (...args: any[]) => any; [key: string]: any }) {
        // Wrap the enumerate function to apply BotCoach logic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wrappedEnumerate = (G: GameState, ctx: any, playerID: string) => {
            // 1. Get ALL valid moves from the base enumerator
            const allMoves = enumerate(G, ctx, playerID);

            if (!allMoves || allMoves.length === 0) {
                return [];
            }

            // 2. Use BotCoach to filter/rank these moves
            let coach = ctx.coach;
            if (!coach) {
                coach = new Coach(G);
            }

            const botCoach = new BotCoach(G, coach);
            const bestMoves = botCoach.filterOptimalMoves(allMoves, playerID, ctx);

            // 3. Return the best moves
            return bestMoves.length > 0 ? bestMoves : allMoves;
        };

        // Pass the wrapped enumerator to the base RandomBot
        super({ enumerate: wrappedEnumerate, ...args });
    }
}
