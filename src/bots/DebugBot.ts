import { RandomBot } from 'boardgame.io/ai';
import { GameState } from '../game/types';
import { STAGES } from '../game/constants';
import { Coach } from '../game/analysis/coach';

export class DebugBot extends RandomBot {
    private _enumerate: Function | undefined;

    constructor({ enumerate, ...args }: any) {
        // Do NOT pass enumerate to super() to avoid shadowing this class's enumerate method
        super(args);
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

        // Fallback to RandomBot behavior
        if (this._enumerate) {
            return this._enumerate(G, ctx, playerID);
        }
        return [];
    }
}
