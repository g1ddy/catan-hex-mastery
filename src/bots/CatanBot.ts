import { Bot } from 'boardgame.io/ai';
import { GameState, GameAction, BotMove, MakeMoveAction } from '../game/core/types';
import { Coach } from '../game/analysis/coach';
import { BotCoach } from './BotCoach';
import { Ctx } from 'boardgame.io';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';

const DEFAULT_GREED_FACTOR = 0.6;

function isBotMove(action: GameAction): action is BotMove {
    return 'move' in action;
}

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

        // 1. Get ALL valid moves from the base enumerator
        const allMoves = this.enumerate(G, ctx, playerID) as GameAction[];

        if (!allMoves || allMoves.length === 0) {
            // Must return strictly typed object, even if no action, to satisfy Bot signature
            // return undefined to indicate no move possible (pass)
            return undefined as any;
        }

        // The enumerator can return a mix of BotMove and MakeMoveAction objects.
        // The BotCoach only understands BotMove, so we filter for those.
        const botMoves = allMoves.filter(isBotMove);

        // 2. Use BotCoach to filter/rank these moves
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let coach = (ctx as any).coach;
        if (!coach) {
            coach = new Coach(G);
        }

        const botCoach = new BotCoach(G, coach, this.profile);
        // Note: filterOptimalMoves returns a sorted list where index 0 is best
        const bestMoves = botCoach.filterOptimalMoves(botMoves, playerID, ctx);
        const candidates = bestMoves.length > 0 ? bestMoves : botMoves;

        // 3. Pick weighted randomly from the candidates (favoring top ranks)
        const selectedIndex = this.pickWeightedIndex(candidates.length, DEFAULT_GREED_FACTOR);
        const selectedMove = candidates[selectedIndex];

        // 4. Construct proper MAKE_MOVE action
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
                type: 'MAKE_MOVE',
                payload: actionPayload
            },
            metadata: { message: `CatanBot (${this.profile.name})` }
        };
    }
}
