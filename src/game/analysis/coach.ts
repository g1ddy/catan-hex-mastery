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

        // eslint-disable-next-line security/detect-object-injection
        const player = this.G.players[playerID];
        const tradeResult = calculateTrade(player.resources);

        if (!tradeResult.canTrade) {
            return { isSafe: false, reason: "Cannot Afford Trade" };
        }

        // Smart Ban: Protect Ore (City bottleneck)
        // If we are giving away Ore and have <= ORE_RESERVE_THRESHOLD, we shouldn't trade it away.
        if (tradeResult.give === 'ore' && player.resources.ore <= ORE_RESERVE_THRESHOLD) {
            return { isSafe: false, reason: "Ore Reserve Low" };
        }

        return { isSafe: true };
    }

    private getVertexData(hexIds: string[]): { resources: string[], pips: number } {
        return hexIds.reduce((acc, hId) => {
            // Validate hex ID exists before accessing
            if (!Object.prototype.hasOwnProperty.call(this.G.board.hexes, hId)) {
                return acc;
            }
            // eslint-disable-next-line security/detect-object-injection
            const hex = this.G.board.hexes[hId];
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
        // Security: Only return recommendations for the current player.
        if (playerID !== ctx.currentPlayer) {
            return [];
        }

        const recommendations: CoachRecommendation[] = [];

        // 1. Calculate Scarcity Map
        const scarcityMap = this.calculateScarcityMap();

        // 2. Identify Existing Resources
        const existingResources = this.getExistingResources(playerID);

        // 3. Identify all candidates (physically valid spots)
        const candidates = getValidSetupSettlementSpots(this.G);

        // 4. Score candidates
        candidates.forEach(vId => {
            const score = this.scoreVertex(vId, playerID, scarcityMap, existingResources);
            recommendations.push(score);
        });

        return recommendations;
    }

    /**
     * Scores a list of specific vertices for City placement.
     */
    public getBestCitySpots(playerID: string, ctx: Ctx, candidates: string[]): CoachRecommendation[] {
        // Security: Only return recommendations for the current player.
        if (playerID !== ctx.currentPlayer) {
            return [];
        }

        const recommendations: CoachRecommendation[] = [];

        // 1. Calculate Scarcity Map
        const scarcityMap = this.calculateScarcityMap();

        // 2. Identify Existing Resources
        const existingResources = this.getExistingResources(playerID);

        // 3. Score candidates
        candidates.forEach(vId => {
            // Basic input sanitization for vertex ID
            if (typeof vId !== 'string' || vId.includes('__proto__') || vId.includes('constructor')) {
                return;
            }

            try {
                const score = this.scoreVertex(vId, playerID, scarcityMap, existingResources);
                recommendations.push(score);
            } catch (error) {
                console.error(`Error scoring vertex ${vId}:`, error);
                // Skip invalid vertices
            }
        });

        return recommendations.sort((a, b) => b.score - a.score);
    }

    private calculateScarcityMap(): Record<string, boolean> {
        const totalPips = this.G.boardStats.totalPips;
        const totalBoardPips = Object.values(totalPips).reduce((a, b) => a + b, 0);
        const scarcityMap: Record<string, boolean> = {};

        if (totalBoardPips > 0) {
            Object.entries(totalPips).forEach(([resource, pips]) => {
                if (pips / totalBoardPips < this.config.scarcityThreshold) {
                    scarcityMap[resource] = true; // eslint-disable-line security/detect-object-injection
                }
            });
        }
        return scarcityMap;
    }

    private getExistingResources(playerID: string): Set<string> {
        // Security: Validate playerID exists to prevent prototype pollution
        if (!isValidPlayer(playerID, this.G)) {
            return new Set<string>();
        }

        const player = this.G.players[playerID]; // eslint-disable-line security/detect-object-injection
        const existingResources = new Set<string>();

        if (player.settlements.length >= 1) {
            player.settlements.forEach(sVId => {
                const hexIds = getHexesForVertex(sVId);
                const { resources } = this.getVertexData(hexIds);
                resources.forEach(r => existingResources.add(r));
            });
        }
        return existingResources;
    }

    private calculateScarcityScore(uniqueResources: Set<string>, scarcityMap: Record<string, boolean>) {
        const scarceResources = Array.from(uniqueResources).filter(r => scarcityMap[r]); // eslint-disable-line security/detect-object-injection
        if (scarceResources.length > 0) {
            return {
                multiplier: this.config.scarcityMultiplier,
                bonus: true,
                resources: scarceResources,
                reason: 'Scarcity Bonus'
            };
        }
        return { multiplier: 1, bonus: false, resources: [], reason: '' };
    }

    private calculateDiversityScore(resources: string[], uniqueResources: Set<string>) {
        if (uniqueResources.size === 3 && resources.length === 3) {
            return {
                multiplier: this.config.diversityMultiplier,
                bonus: true,
                reason: 'Diversity Bonus'
            };
        }
        return { multiplier: 1, bonus: false, reason: '' };
    }

    private calculateSynergyScore(
        resources: string[],
        uniqueResources: Set<string>,
        settlementCount: number,
        existingResources: Set<string>
    ) {
        let score = 0;
        let synergyBonus = false;
        let neededResources: string[] = [];
        const reasons: string[] = [];

        if (settlementCount === 0) {
            const hasWood = resources.includes('wood');
            const hasBrick = resources.includes('brick');
            const hasOre = resources.includes('ore');
            const hasWheat = resources.includes('wheat');

            if ((hasWood && hasBrick) || (hasOre && hasWheat)) {
                score += this.config.synergyBonus;
                synergyBonus = true;
                reasons.push('Synergy');
            }
        } else if (settlementCount >= 1) {
            const newResources: string[] = [];
            uniqueResources.forEach(r => {
                if (!existingResources.has(r)) {
                    score += this.config.needBonus;
                    newResources.push(r);
                }
            });

            if (newResources.length > 0) {
                neededResources = newResources.sort();
                reasons.push(`Balances Economy (Added ${newResources.join(', ')})`);
            }
        }

        return {
            score,
            synergyBonus,
            neededResources,
            reasons
        };
    }

    private scoreVertex(
        vertexId: string,
        playerID: string,
        scarcityMap: Record<string, boolean>,
        existingResources: Set<string>
    ): CoachRecommendation {
        // Security check for playerID
        if (!isValidPlayer(playerID, this.G)) {
             throw new Error(`Player ${playerID} not found`);
        }

        // OPTIMIZATION: Parse vertexId once and pass to helpers
        // Previously: getResourcesForVertex and calculatePipsForVertex both split the string
        const hexIds = getHexesForVertex(vertexId);

        const { resources, pips } = this.getVertexData(hexIds);
        const uniqueResources = new Set(resources);
        const settlementCount = this.G.players[playerID].settlements.length; // eslint-disable-line security/detect-object-injection

        let score = pips;
        const reasons: string[] = [`${pips} Pips`];

        // 1. Scarcity
        const scarcity = this.calculateScarcityScore(uniqueResources, scarcityMap);
        if (scarcity.bonus) {
            score *= scarcity.multiplier;
            reasons.push(scarcity.reason);
        }

        // 2. Diversity
        const diversity = this.calculateDiversityScore(resources, uniqueResources);
        if (diversity.bonus) {
            score *= diversity.multiplier;
            reasons.push(diversity.reason);
        }

        // 3. Synergy / Needs
        const synergy = this.calculateSynergyScore(resources, uniqueResources, settlementCount, existingResources);
        if (synergy.score > 0) {
            score += synergy.score;
        }
        if (synergy.reasons.length > 0) {
            reasons.push(...synergy.reasons);
        }

        return {
            vertexId: vertexId,
            score: Math.round(score * 10) / 10,
            reason: reasons.join(', '),
            details: {
                pips: pips,
                scarcityBonus: scarcity.bonus,
                scarceResources: scarcity.resources,
                diversityBonus: diversity.bonus,
                synergyBonus: synergy.synergyBonus,
                neededResources: synergy.neededResources
            }
        };
    }

    public getBestSettlementSpots(playerID: string, ctx: Ctx): CoachRecommendation[] {
        const allScores = this.getAllSettlementScores(playerID, ctx);
        return allScores.sort((a, b) => b.score - a.score).slice(0, 3);
    }

    public getStrategicAdvice(playerID: string, ctx: Ctx): StrategicAdvice {
        // Security check: Validate playerID before use
        if (!isValidPlayer(playerID, this.G)) {
            return ERROR_ADVICE_RESULT;
        }

        // Security check: Only provide advice to the current player.
        if (playerID !== ctx.currentPlayer) {
            return ERROR_ADVICE_RESULT;
        }

        // eslint-disable-next-line security/detect-object-injection
        const player = this.G.players[playerID];
        const stage = ctx.activePlayers?.[playerID] ?? ctx.phase;

        // 1. Setup Phase
        if (stage === STAGES.PLACE_SETTLEMENT) {
            return {
                text: STRATEGIC_ADVICE.SETUP.SETTLEMENT,
                recommendedMoves: []
            };
        }
        if (stage === STAGES.PLACE_ROAD) {
            return {
                text: STRATEGIC_ADVICE.SETUP.ROAD,
                recommendedMoves: []
            };
        }

        // 2. Gameplay Phase (Acting)
        if (stage === STAGES.ACTING || stage === STAGES.ROLLING) {
            const vp = player.victoryPoints;

            // Early Game
            if (vp < EARLY_GAME_VP_THRESHOLD) {
                return {
                    text: STRATEGIC_ADVICE.GAMEPLAY.EARLY,
                    recommendedMoves: ['buildRoad', 'buildSettlement']
                };
            }
            // Mid Game
            else if (vp <= MID_GAME_VP_THRESHOLD) {
                return {
                    text: STRATEGIC_ADVICE.GAMEPLAY.MID,
                    recommendedMoves: ['buildCity']
                };
            }
            // Late Game
            else {
                return {
                    text: STRATEGIC_ADVICE.GAMEPLAY.LATE,
                    // Advice says "Buy Dev Cards... connect roads".
                    // Since Dev Cards aren't implemented, we recommend Roads.
                    recommendedMoves: ['buildRoad']
                };
            }
        }

        return {
            text: STRATEGIC_ADVICE.DEFAULT,
            recommendedMoves: []
        };
    }

    /**
     * Generic action scorer for BotCoach.
     * Evaluates a full action object, combining spatial scoring (for spots) and strategic scoring (for types).
     *
     * @experimental This method is intended for future generic Bot implementations (e.g. MCTS) that need a
     * unified evaluation function. Currently, `BotCoach.ts` uses an optimized inline version of this logic
     * to avoid performance overhead from repeated scarcity map calculations.
     */
    public scoreAction(playerID: string, action: GameAction, ctx: Ctx): number {
        // Handle payload vs simple format
        const moveName = 'payload' in action ? action.payload.type : (action as BotMove).move;
        const args = 'payload' in action ? action.payload.args : (action as BotMove).args;

        const advice = this.getStrategicAdvice(playerID, ctx);
        let score = 1.0;

        // 1. Strategic Boost: If the move type is recommended by Coach, boost it.
        // Cast moveName to string to match advice.recommendedMoves signature
        if (advice.recommendedMoves.includes(moveName)) {
            score *= 1.5; // 50% boost for following advice
        }

        // 2. Spatial Scoring: If it's a placement move, use the spatial score.
        if (moveName === 'placeSettlement' || moveName === 'buildSettlement') {
            const arg0 = args[0];
            const vId = typeof arg0 === 'string' ? arg0 : undefined;

            if (vId) {
                try {
                    // Reuse scoreVertex
                    // Need to recalculate maps per call? Inefficient but accurate.
                    // For performance, BotCoach typically pre-calculates, but here we do it on demand.
                    const scarcityMap = this.calculateScarcityMap();
                    const existingResources = this.getExistingResources(playerID);
                    const vertexScore = this.scoreVertex(vId, playerID, scarcityMap, existingResources);

                    // Normalize spatial score (typically 0-15) to be comparable with weight (0-1)
                    // Let's say max score is ~20.
                    score *= (1 + vertexScore.score / SPATIAL_SCORE_NORMALIZATION_FACTOR);
                } catch (e) {
                    // Ignore invalid vertices
                }
            }
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

    let ratio = (score - min) / (max - min);
    ratio = Math.max(0, Math.min(1, ratio));

    const hue = ratio * 120;
    return `hsl(${hue}, 100%, 50%)`;
}
