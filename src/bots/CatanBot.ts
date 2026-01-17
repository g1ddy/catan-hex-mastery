import { Bot } from 'boardgame.io/ai';
import { GameState, GameAction, BotMove } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { BotCoach } from './BotCoach';
import { Ctx } from 'boardgame.io';

export class CatanBot extends Bot {
    constructor({ enumerate, seed }: { enumerate: (G: GameState, ctx: Ctx, playerID: string) => GameAction[]; seed?: string | number } = { enumerate: () => [] }) {
        super({ enumerate, seed });
    }

    /**
     * Selects an index from the list using a geometric distribution.
     * Favors lower indices (better moves).
     * @param count Number of candidates
     * @param p Probability to pick the current index (0 < p <= 1). Higher p = more greedy.
     */
    private pickWeightedIndex(count: number, p = 0.6): number {
        if (count <= 1) return 0;

        let index = 0;
        // Keep flipping a coin. If heads (prob p), pick current. If tails, move to next.
        // Stop at last element.
        while (index < count - 1) {
            if (this.random() < p) {
                return index;
            }
            index++;
        }
        return index;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async play(state: { G: GameState; ctx: Ctx }, playerID: string) {
        const { G, ctx } = state;

        // 1. Get ALL valid moves from the base enumerator
        const allMoves = this.enumerate(G, ctx, playerID);

        if (!allMoves || allMoves.length === 0) {
            // Must return strictly typed object, even if no action, to satisfy Bot signature
            // though typical Bots return action. If no action, framework might handle it,
            // but return type expects { action: BotAction }
            // Let's return undefined explicitly cast or handle it.
            // Actually, if no moves, we can just return a dummy pass or similar, but
            // usually returning undefined is handled by the framework loop.
            // However, TS strictness here requires us to match signature.
            // Let's return a "No Op" metadata only if allowed, or throw.
            // But base signature is Promise<{ action: BotAction, metadata?: any }>
            // So we MUST return an action.
            // For now, let's keep the return; but cast strictly or make return type compatible.
            // If we assume framework handles void return for "no move possible" (pass),
            // we can try casting.
            return {} as any;
        }

        // 2. Use BotCoach to filter/rank these moves
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let coach = (ctx as any).coach;
        if (!coach) {
            coach = new Coach(G);
        }

        const botCoach = new BotCoach(G, coach);
        // Note: filterOptimalMoves returns a sorted list where index 0 is best
        const bestMoves = botCoach.filterOptimalMoves(allMoves as GameAction[], playerID, ctx);
        const candidates = bestMoves.length > 0 ? bestMoves : allMoves;

        // 3. Pick weighted randomly from the candidates (favoring top ranks)
        const selectedIndex = this.pickWeightedIndex(candidates.length, 0.6);
        const selectedMove = candidates[selectedIndex];

        // 4. Construct proper MAKE_MOVE action
        let actionPayload: { type: string, args: any[], playerID: string };

        if ('type' in selectedMove && selectedMove.type === 'MAKE_MOVE') {
             // It's already a Redux action
             actionPayload = selectedMove.payload;
        } else {
             // It's a BotMove
             const move = selectedMove as BotMove;
             actionPayload = {
                 type: move.move,
                 args: move.args || [],
                 playerID
             };
        }

        return {
            action: {
                type: 'MAKE_MOVE',
                payload: actionPayload
            },
            metadata: { message: 'CatanBot' }
        };
    }
}
