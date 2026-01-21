import { Ctx } from 'boardgame.io';
import { GameState, TerrainType, GameAction, BotMove } from '../types';
import { getValidSetupSettlementSpots } from '../rules/validator';
import { isValidPlayer } from '../../utils/validation';
import { getPips } from '../mechanics/scoring';
import { TERRAIN_TO_RESOURCE } from '../mechanics/resources';
import { calculateTrade } from '../mechanics/trade';
import { STAGES } from '../constants';
import { getHexesForVertex } from '../hexUtils';
import { STRATEGIC_ADVICE } from './adviceConstants';
import { safeGet } from '../../utils/objectUtils';

export const ORE_RESERVE_THRESHOLD = 6;

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

    constructor(G: GameState, config: Partial<CoachConfig> = {}) {
        this.G = G;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Evaluates if a Bank Trade is safe or advisable for the player.
     * Enforces "Smart Ban" logic (e.g., don't trade Ore if low).
     */
    public evaluateTrade(playerID: string): { isSafe: boolean, reason?: string } {
        if (!isValidPlayer(playerID, this.G)) {
            return { isSafe: false, reason: "Invalid Player" };
        }

        const player = this.G.players[playerID];
        const tradeResult = calculateTrade(player.resources);

        if (!tradeResult.canTrade) {
            return { isSafe: false, reason: "Cannot Afford Trade" };
        }

        // Smart Ban: Protect Ore (City bottleneck)
        if (tradeResult.give === 'ore' && player.resources.ore <= ORE_RESERVE_THRESHOLD) {
            return { isSafe: false, reason: "Ore Reserve Low" };
        }

        return { isSafe: true };
    }

    private getVertexData(hexIds: string[]): { resources: string[], pips: number } {
        return hexIds.reduce((acc, hId) => {
            const hex = safeGet(this.G.board.hexes, hId);
            if (!hex) return acc;

            if (hex.terrain) {
                const res = TERRAIN_TO_RESOURCE[hex.terrain];
                if (res) {
                    acc.resources.push(res);
                }
            }

            if (hex.terrain !== TerrainType.Desert && hex.terrain !== TerrainType.Sea) {
                acc.pips += getPips(hex.tokenValue || 0);
            }

            return acc;
        }, { resources: [] as string[], pips: 0 });
    }

    /**
     * Calculates scores for all valid settlement spots on the board.
     */
    public getAllSettlementScores(playerID: string, ctx: Ctx): CoachRecommendation[] {
        if (playerID !== ctx.currentPlayer) {
            return [];
        }

        const scarcityMap = this.calculateScarcityMap();
        const existingResources = this.getExistingResources(playerID);
        const candidates = getValidSetupSettlementSpots(this.G);

        return Array.from(candidates).map(vId => this.scoreVertex(vId, playerID, scarcityMap, existingResources));
    }

    /**
     * Scores a list of specific vertices for City placement.
     */
    public getBestCitySpots(playerID: string, ctx: Ctx, candidates: string[]): CoachRecommendation[] {
        if (playerID !== ctx.currentPlayer) {
            return [];
        }

        const scarcityMap = this.calculateScarcityMap();
        const existingResources = this.getExistingResources(playerID);

        const recommendations = candidates
            .map(vId => {
                if (typeof vId !== 'string' || vId.includes('__proto__') || vId.includes('constructor') || vId.includes('prototype')) return null;
                try {
                    return this.scoreVertex(vId, playerID, scarcityMap, existingResources);
                } catch (error) {
                    console.error(`Error scoring vertex ${vId}:`, error);
                    return null;
                }
            })
            .filter((r): r is CoachRecommendation => r !== null);

        return recommendations.sort((a, b) => b.score - a.score);
    }

    private calculateScarcityMap(): Record<string, boolean> {
        const totalPips = this.G.boardStats.totalPips;
        const totalBoardPips = Object.values(totalPips).reduce((a, b) => a + b, 0);
        const scarcityMap: Record<string, boolean> = {};

        if (totalBoardPips > 0) {
            Object.entries(totalPips).forEach(([resource, pips]) => {
                if (pips / totalBoardPips < this.config.scarcityThreshold) {
                    scarcityMap[resource] = true;
                }
            });
        }
        return scarcityMap;
    }

    private getExistingResources(playerID: string): Set<string> {
        if (!isValidPlayer(playerID, this.G)) {
            return new Set<string>();
        }

        const player = safeGet(this.G.players, playerID);
        if (!player) return new Set<string>();
        const existingResources = new Set<string>();

        player.settlements.forEach(sVId => {
            const hexIds = getHexesForVertex(sVId);
            const { resources } = this.getVertexData(hexIds);
            resources.forEach(r => existingResources.add(r));
        });

        return existingResources;
    }

    private calculateScarcityScore(uniqueResources: Set<string>, scarcityMap: Record<string, boolean>) {
        const scarceResources = Array.from(uniqueResources).filter(r => scarcityMap[r]);
        const bonus = scarceResources.length > 0;
        return {
            multiplier: bonus ? this.config.scarcityMultiplier : 1,
            bonus,
            resources: scarceResources,
            reason: bonus ? 'Scarcity Bonus' : ''
        };
    }

    private calculateDiversityScore(resources: string[], uniqueResources: Set<string>) {
        const bonus = uniqueResources.size === 3 && resources.length === 3;
        return {
            multiplier: bonus ? this.config.diversityMultiplier : 1,
            bonus,
            reason: bonus ? 'Diversity Bonus' : ''
        };
    }

    private calculateSynergyScore(
        resources: string[],
        uniqueResources: Set<string>,
        settlementCount: number,
        existingResources: Set<string>
    ) {
        let score = 0;
        let synergyBonus = false;
        const neededResources: string[] = [];
        const reasons: string[] = [];

        if (settlementCount === 0) {
            if ((resources.includes('wood') && resources.includes('brick')) ||
                (resources.includes('ore') && resources.includes('wheat'))) {
                score += this.config.synergyBonus;
                synergyBonus = true;
                reasons.push('Synergy');
            }
        } else {
            const newResources = Array.from(uniqueResources).filter(r => !existingResources.has(r));
            if (newResources.length > 0) {
                score += this.config.needBonus * newResources.length;
                neededResources.push(...newResources.sort());
                reasons.push(`Balances Economy (Added ${newResources.join(', ')})`);
            }
        }

        return { score, synergyBonus, neededResources, reasons };
    }

    private scoreVertex(
        vertexId: string,
        playerID: string,
        scarcityMap: Record<string, boolean>,
        existingResources: Set<string>
    ): CoachRecommendation {
        if (!isValidPlayer(playerID, this.G)) {
             throw new Error(`Player ${playerID} not found`);
        }

        const hexIds = getHexesForVertex(vertexId);
        const { resources, pips } = this.getVertexData(hexIds);
        const uniqueResources = new Set(resources);
        const settlementCount = this.G.players[playerID].settlements.length;

        let score = pips;
        const reasons: string[] = [`${pips} Pips`];

        const scarcity = this.calculateScarcityScore(uniqueResources, scarcityMap);
        if (scarcity.bonus) {
            score *= scarcity.multiplier;
            reasons.push(scarcity.reason);
        }

        const diversity = this.calculateDiversityScore(resources, uniqueResources);
        if (diversity.bonus) {
            score *= diversity.multiplier;
            reasons.push(diversity.reason);
        }

        const synergy = this.calculateSynergyScore(resources, uniqueResources, settlementCount, existingResources);
        score += synergy.score;
        reasons.push(...synergy.reasons);

        return {
            vertexId,
            score: Math.round(score * 10) / 10,
            reason: reasons.filter(Boolean).join(', '),
            details: {
                pips,
                scarcityBonus: scarcity.bonus,
                scarceResources: scarcity.resources,
                diversityBonus: diversity.bonus,
                synergyBonus: synergy.synergyBonus,
                neededResources: synergy.neededResources
            }
        };
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
                const scarcityMap = this.calculateScarcityMap();
                const existingResources = this.getExistingResources(playerID);
                const vertexScore = this.scoreVertex(vId, playerID, scarcityMap, existingResources);
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
