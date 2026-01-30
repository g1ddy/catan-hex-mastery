import { Bot } from 'boardgame.io/ai';
import { GameState, GameAction, BotMove, MakeMoveAction } from '../game/core/types';
import { Coach, CoachCtx } from '../game/analysis/coach';
import { BotCoach } from './BotCoach';
import { Ctx } from 'boardgame.io';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';
import { ActionUtils } from './utils/ActionUtils';

const DEFAULT_GREED_FACTOR = 0.6;
const RESOLVE_ROLL_DELAY_MS = 1000;

export type CatanBotConfig = {
    enumerate: (G: GameState, ctx: Ctx, playerID: string) => GameAction[];
    seed?: string | number;
};

export class CatanBot extends Bot {
    protected profile: BotProfile;

    constructor(config: CatanBotConfig = { enumerate: () => [] }, profile: BotProfile = BALANCED_PROFILE) {
        super(config);
        this.profile = profile;
    }

    /**
     * Selects an index from the list using a geometric distribution.
     * Favors lower indices (better moves).
     * @param count Number of candidates
     * @param p Probability to pick the current index (0 < p <= 1). Higher p = more greedy.
     */
    private pickWeightedIndex(count: number, p = DEFAULT_GREED_FACTOR): number {
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

    async play(state: { G: GameState; ctx: Ctx }, playerID: string) {
        const { G, ctx } = state;

        // 0. Safety: Never attempt a move if it's not our turn
        // This prevents console spam and unauthorized move attempts.
        if (playerID !== ctx.currentPlayer) {
            return undefined as any;
        }

        // 1. Get ALL valid moves from the base enumerator
        const allMoves = this.enumerate(G, ctx, playerID) as GameAction[];

        if (!allMoves || allMoves.length === 0) {
            return undefined as any;
        }

        // 2. Use BotCoach to filter/rank these moves
        let coach = (ctx as CoachCtx).coach;
        if (!coach) {
            console.warn('Coach plugin not found in ctx, falling back to transient Coach instance');
            coach = new Coach(G);
        }

        const botCoach = new BotCoach(G, coach, this.profile);
        // Note: filterOptimalMoves returns a sorted list where index 0 is best
        const bestMoves = botCoach.filterOptimalMoves(allMoves, playerID, ctx);

        // If it's our turn but filterOptimalMoves returns nothing (which shouldn't happen if allMoves is non-empty),
        // we fallback to allMoves to avoid the bot getting stuck, but this is a secondary safety.
        const candidates = bestMoves.length > 0 ? bestMoves : allMoves;

        // 3. Pick weighted randomly from the candidates (favoring top ranks)
        const selectedIndex = this.pickWeightedIndex(candidates.length, DEFAULT_GREED_FACTOR);
        const selectedMove = candidates[selectedIndex];

        if (!selectedMove) {
            return undefined as any;
        }

        // 4. Handle Resolution Delay (sync with UI animations)
        const moveName = ActionUtils.getMoveName(selectedMove);
        if (moveName === 'resolveRoll') {
            await new Promise(resolve => setTimeout(resolve, RESOLVE_ROLL_DELAY_MS));
        }

        // 5. Construct proper MAKE_MOVE action
        let actionPayload: MakeMoveAction['payload'];

        if ('type' in selectedMove && selectedMove.type === 'MAKE_MOVE') {
             // It's already a Redux action
             // Explicit cast to satisfy strict union matching against potential generic widening
             actionPayload = selectedMove.payload as MakeMoveAction['payload'];
        } else {
             // It's a BotMove
             const move = selectedMove as BotMove;
             // TypeScript can't easily infer that { type: K, args: Args[K] } matches the union when K is generic/dynamic
             // so we cast to 'any' before casting to the final union type to bypass the "not assignable" error.
             actionPayload = {
                 type: move.move,
                 args: move.args,
                 playerID
             } as any as MakeMoveAction['payload'];
        }

        return {
            action: {
                type: 'MAKE_MOVE' as const,
                payload: actionPayload
            },
            metadata: { message: `CatanBot (${this.profile.name})` }
        };
    }
}
