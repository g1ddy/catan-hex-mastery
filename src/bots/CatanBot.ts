import { Bot } from 'boardgame.io/ai';
import { GameState, GameAction } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { BotCoach } from './BotCoach';

export class CatanBot extends Bot {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor({ enumerate, seed }: { enumerate: (...args: any[]) => any; seed?: string | number } = { enumerate: () => [] }) {
        super({ enumerate, seed });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async play(state: { G: GameState; ctx: any }, playerID: string) {
        const { G, ctx } = state;

        // 1. Get ALL valid moves from the base enumerator
        const allMoves = this.enumerate(G, ctx, playerID);

        if (!allMoves || allMoves.length === 0) {
            return;
        }

        // 2. Use BotCoach to filter/rank these moves
        let coach = ctx.coach;
        if (!coach) {
            coach = new Coach(G);
        }

        const botCoach = new BotCoach(G, coach);
        // Note: filterOptimalMoves may return a sorted list where index 0 is best
        // Current logic preserves "Random among Best" if filterOptimalMoves returns multiple
        const bestMoves = botCoach.filterOptimalMoves(allMoves as GameAction[], playerID, ctx);
        const candidates = bestMoves.length > 0 ? bestMoves : allMoves;

        // 3. Pick randomly from the candidates
        const selectedMove = candidates[Math.floor(this.random() * candidates.length)];

        // Cast to any to bypass strict BotAction type mismatch (handling legacy BotMove)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { action: selectedMove, metadata: { message: 'CatanBot' } } as any;
    }
}
