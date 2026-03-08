import { Ctx } from 'boardgame.io';
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
    ctx: Ctx;
}

export class MoveScorer {
    public getWeightedScore(move: GameAction, context: ScoringContext): number {
        const name = ActionUtils.getMoveName(move) as string;
        let weight = this.getBaseWeight(name, context.profile);

        // Coach Strategic Multiplier
        if (context.advisedMoves.has(name)) {
            weight *= STRATEGIC_ADVICE_BOOST;
        }

        return this.applyDynamicMultipliers(weight, name, context);
    }

    private getBaseWeight(name: string, profile: BotProfile): number {
        switch (name) {
            case 'buildCity': return profile.weights.buildCity;
            case 'buildSettlement': return profile.weights.buildSettlement;
            case 'buildRoad':
            case 'placeRoad': return profile.weights.buildRoad;
            case 'buyDevCard': return profile.weights.buyDevCard;
            case 'endTurn': return 1.0;
            case 'tradeBank': return profile.weights.tradeBank;
            default: return 0.5;
        }
    }

    private applyDynamicMultipliers(baseWeight: number, name: string, context: ScoringContext): number {
        let weight = baseWeight;

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
            const tradeEvaluation = context.coach.evaluateTrade(context.playerID, context.ctx);
            if (!tradeEvaluation.isSafe) {
                weight = 0;
            }
        }

        return weight;
    }
}
