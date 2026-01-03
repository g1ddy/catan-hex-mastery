import { RandomBot } from 'boardgame.io/ai';
import { GameState } from '../game/types';
import { STAGES } from '../game/constants';
import { Coach } from '../game/analysis/coach';
import { BotCoach, BotMove } from './BotCoach';

export class DebugBot extends RandomBot {
    private _enumerate: Function | undefined;

    constructor({ enumerate, ...args }: { enumerate: Function; [key: string]: any }) {
        // Pass enumerate to super to satisfy TS and base class requirements
        super({ enumerate: enumerate as any, ...args });
        this._enumerate = enumerate;
        // Delete the instance property created by RandomBot to expose our prototype method
        delete (this as any).enumerate;
    }

    enumerate(G: GameState, ctx: any, playerID: string) {
        const stage = ctx.activePlayers?.[playerID] || STAGES.ROLLING;
        const coach = ctx.coach as Coach;
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

        // Fallback to RandomBot behavior
        if (this._enumerate) {
            return this._enumerate(G, ctx, playerID);
        }
        return [];
    }
}
