import { RandomBot } from 'boardgame.io/ai';
import { CatanCtx, GameState } from '../game/types';

export class DebugBot extends RandomBot {
  enumerate(G: GameState, ctx: CatanCtx, playerID: string) {
    // If we are in the Setup Phase and placing a settlement, use the Coach!
    if (ctx.activePlayers && ctx.activePlayers[playerID] === 'placeSettlement') {
        const advice = ctx.coach.getAdvice(playerID);

        if (advice && advice.length > 0) {
            const bestMove = advice[0];
            return [{
                move: 'placeSettlement',
                args: [bestMove.vertexId]
            }];
        }
    }

    // Fallback to Random behavior for everything else (Roads, Building, etc.)
    return super.enumerate(G, ctx, playerID);
  }
}
