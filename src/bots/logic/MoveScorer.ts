import { GameAction } from '../../game/core/types';
import { BotProfile } from '../profiles/BotProfile';
import { Coach } from '../../game/analysis/coach';
import { getAffordableBuilds } from '../../game/mechanics/costs';
import { ActionUtils } from '../utils/ActionUtils';

// Constants extracted from BotCoach
const STRATEGIC_ADVICE_BOOST = 1.5;
const AFFORDABLE_BOOST = 10.0;
const ROAD_FATIGUE_PENALTY = 0.01;
const TRADE_BOOST = 5.0;

export interface ScoringContext {
    profile: BotProfile;
    advisedMoves: Set<string>;
    affordable: ReturnType<typeof getAffordableBuilds>;
    isRoadFatigued: boolean;
    coach: Coach;
    playerID: string;
}

export class MoveScorer {
    public getWeightedScore(move: GameAction, context: ScoringContext): number {
        const name = ActionUtils.getMoveName(move) as string;
        let weight = 0;

        // Base Weight from Profile
        switch (name) {
            case 'buildCity': weight = context.profile.weights.buildCity; break;
            case 'buildSettlement': weight = context.profile.weights.buildSettlement; break;
            case 'buildRoad': weight = context.profile.weights.buildRoad; break;
            case 'placeRoad': weight = context.profile.weights.buildRoad; break;
            case 'buyDevCard': weight = context.profile.weights.buyDevCard; break;
            case 'endTurn': weight = 1.0; break;
            case 'tradeBank': weight = context.profile.weights.tradeBank; break;
            default: weight = 0.5; break;
        }

        // Coach Strategic Multiplier
        if (context.advisedMoves.has(name)) {
            weight *= STRATEGIC_ADVICE_BOOST;
        }

        // Dynamic Logic Multipliers
        if (name === 'buildSettlement' && context.affordable.settlement) {
            weight *= AFFORDABLE_BOOST;
        }
        if (name === 'buildCity' && context.affordable.city) {
            weight *= AFFORDABLE_BOOST;
        }
        if (name === 'buildRoad') {
            if (context.isRoadFatigued) {
                weight *= ROAD_FATIGUE_PENALTY;
            }
        }
        if (name === 'tradeBank') {
            // If we can't afford a settlement, but can trade, boost trade.
            if (!context.affordable.settlement) {
                 weight *= TRADE_BOOST;
            }

            // Smart Ban: Protect Ore (City bottleneck) using shared Coach logic
            const tradeEvaluation = context.coach.evaluateTrade(context.playerID);
            if (!tradeEvaluation.isSafe) {
                weight = 0;
            }
        }

        return weight;
    }
}
