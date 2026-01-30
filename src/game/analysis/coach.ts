import { Ctx } from 'boardgame.io';
import { GameState, GameAction, BotMove } from '../core/types';
import { isValidPlayer } from '../core/validation';
import { STAGES } from '../core/constants';
import { STRATEGIC_ADVICE } from './adviceConstants';
import { TradeAdvisor } from './advisors/TradeAdvisor';
import { SpatialAdvisor } from './advisors/SpatialAdvisor';

export interface CoachRecommendation {
    vertexId: string;
    score: number;
    reason: string;
    details: {
        pips: number;
        scarcityBonus: boolean;
        scarceResources: string[];
        diversityBonus: boolean;
        synergyBonus: boolean;
        neededResources: string[];
    };
}

export interface StrategicAdvice {
    text: string;
    recommendedMoves: string[];
}

export interface CoachCtx extends Ctx {
    coach?: Coach;
}

export interface CoachConfig {
    scarcityThreshold: number;
    scarcityMultiplier: number;
    diversityMultiplier: number;
    synergyBonus: number;
    needBonus: number;
}

const DEFAULT_CONFIG: CoachConfig = {
    scarcityThreshold: 0.10,
    scarcityMultiplier: 1.2,
    diversityMultiplier: 1.2,
    synergyBonus: 2,
    needBonus: 5,
};

const EARLY_GAME_VP_THRESHOLD = 5;
const MID_GAME_VP_THRESHOLD = 7;
const SPATIAL_SCORE_NORMALIZATION_FACTOR = 5;

const ERROR_ADVICE_RESULT: StrategicAdvice = {
    text: STRATEGIC_ADVICE.ERROR.INVALID_PLAYER,
    recommendedMoves: []
};

export class Coach {
    private G: GameState;
    private config: CoachConfig;
    private tradeAdvisor: TradeAdvisor;
    private spatialAdvisor: SpatialAdvisor;

    constructor(G: GameState, config: Partial<CoachConfig> = {}) {
        this.G = G;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.tradeAdvisor = new TradeAdvisor(G);
        this.spatialAdvisor = new SpatialAdvisor(G, this.config);
    }

    /**
     * Evaluates if a Bank Trade is safe or advisable for the player.
     * Delegates to TradeAdvisor.
     */
    public evaluateTrade(playerID: string): { isSafe: boolean, reason?: string } {
        return this.tradeAdvisor.evaluateTrade(playerID);
    }

    /**
     * Calculates scores for all valid settlement spots on the board.
     * Delegates to SpatialAdvisor.
     */
    public getAllSettlementScores(playerID: string, ctx: Ctx): CoachRecommendation[] {
        return this.spatialAdvisor.getAllSettlementScores(playerID, ctx);
    }

    /**
     * Scores a list of specific vertices for City placement.
     * Delegates to SpatialAdvisor.
     */
    public getBestCitySpots(playerID: string, ctx: Ctx, candidates: string[]): CoachRecommendation[] {
        return this.spatialAdvisor.getBestCitySpots(playerID, ctx, candidates);
    }

    public getBestSettlementSpots(playerID: string, ctx: Ctx): CoachRecommendation[] {
        return this.getAllSettlementScores(playerID, ctx)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    }

    public getStrategicAdvice(playerID: string, ctx: Ctx): StrategicAdvice {
        if (!isValidPlayer(playerID, this.G) || playerID !== ctx.currentPlayer) {
            return ERROR_ADVICE_RESULT;
        }

        const player = this.G.players[playerID];
        const stage = ctx.activePlayers?.[playerID] ?? ctx.phase;

        if (stage === STAGES.PLACE_SETTLEMENT) return { text: STRATEGIC_ADVICE.SETUP.SETTLEMENT, recommendedMoves: [] };
        if (stage === STAGES.PLACE_ROAD) return { text: STRATEGIC_ADVICE.SETUP.ROAD, recommendedMoves: [] };

        if (stage === STAGES.ACTING || stage === STAGES.ROLLING) {
            const vp = player.victoryPoints;
            if (vp < EARLY_GAME_VP_THRESHOLD) return { text: STRATEGIC_ADVICE.GAMEPLAY.EARLY, recommendedMoves: ['buildRoad', 'buildSettlement'] };
            if (vp <= MID_GAME_VP_THRESHOLD) return { text: STRATEGIC_ADVICE.GAMEPLAY.MID, recommendedMoves: ['buildCity'] };
            return { text: STRATEGIC_ADVICE.GAMEPLAY.LATE, recommendedMoves: ['buildRoad'] };
        }

        return { text: STRATEGIC_ADVICE.DEFAULT, recommendedMoves: [] };
    }

    public scoreAction(playerID: string, action: GameAction, ctx: Ctx): number {
        const moveName = 'payload' in action ? action.payload.type : (action as BotMove).move;
        const args = 'payload' in action ? action.payload.args : (action as BotMove).args;

        const advice = this.getStrategicAdvice(playerID, ctx);
        let score = 1.0;

        if (advice.recommendedMoves.includes(moveName)) {
            score *= 1.5;
        }

        if ((moveName === 'placeSettlement' || moveName === 'buildSettlement') && typeof args[0] === 'string') {
            const vId = args[0];
            try {
                const vertexScore = this.spatialAdvisor.scoreVertex(vId, playerID);
                score *= (1 + vertexScore.score / SPATIAL_SCORE_NORMALIZATION_FACTOR);
            } catch (e) { /* Ignore invalid vertices */ }
        }

        return score;
    }
}

// --- Backward Compatibility Wrappers ---

export function getAllSettlementScores(G: GameState, playerID: string, ctx: Ctx): CoachRecommendation[] {
    const coach = new Coach(G);
    return coach.getAllSettlementScores(playerID, ctx);
}

export function getBestSettlementSpots(G: GameState, playerID: string, ctx: Ctx): CoachRecommendation[] {
    const coach = new Coach(G);
    return coach.getBestSettlementSpots(playerID, ctx);
}

export function getHeatmapColor(score: number, min: number, max: number): string {
    if (min === max) return 'hsl(120, 100%, 50%)';

    const ratio = Math.max(0, Math.min(1, (score - min) / (max - min)));
    const hue = ratio * 120;
    return `hsl(${hue}, 100%, 50%)`;
}
