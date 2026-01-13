import { Ctx } from 'boardgame.io';
import { GameState, TerrainType } from '../types';
import { getValidSetupSettlementSpots } from '../rules/validator';
import { getPips } from '../mechanics/scoring';
import { TERRAIN_TO_RESOURCE } from '../mechanics/resources';
import { STAGES } from '../constants';
import { getHexesForVertex } from '../hexUtils';

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

export class Coach {
    private G: GameState;
    private config: CoachConfig;

    constructor(G: GameState, config: Partial<CoachConfig> = {}) {
        this.G = G;
        this.config = { ...DEFAULT_CONFIG, ...config };
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
        if (!Object.prototype.hasOwnProperty.call(this.G.players, playerID)) {
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
        const scarceResources = [...uniqueResources].filter(r => scarcityMap[r]); // eslint-disable-line security/detect-object-injection
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
        if (playerID === '__proto__' || playerID === 'constructor' || playerID === 'prototype') {
             throw new Error("Invalid playerID");
        }
        // eslint-disable-next-line security/detect-object-injection
        if (!this.G.players[playerID]) {
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

    public getStrategicAdvice(playerID: string, ctx: Ctx): string {
        // Security check: Only provide advice to the current player.
        if (playerID !== ctx.currentPlayer) {
            return "Invalid player ID.";
        }

        // eslint-disable-next-line security/detect-object-injection
        const player = this.G.players[playerID];
        const stage = ctx.activePlayers?.[playerID] ?? ctx.phase;

        // 1. Setup Phase
        if (stage === STAGES.PLACE_SETTLEMENT) {
            return "Focus on high-pip spots with diverse resources (Wood/Brick for roads, Ore/Wheat for cities).";
        }
        if (stage === STAGES.PLACE_ROAD) {
            return "Point your road toward future expansion spots or the coast.";
        }

        // 2. Gameplay Phase (Acting)
        if (stage === STAGES.ACTING || stage === STAGES.ROLLING) {
            const vp = player.victoryPoints;

            // Early Game (< 5 VP)
            if (vp < 5) {
                return "Early Game: Focus on expansion. Prioritize Wood and Brick to build new settlements and roads.";
            }
            // Mid Game (5-7 VP)
            else if (vp <= 7) {
                return "Mid Game: Consolidate power. Upgrade settlements to cities (Ore/Wheat) and block opponents.";
            }
            // Late Game (> 7 VP)
            else {
                return "Late Game: Push for victory! Buy Development Cards for VPs/Knights or connect roads for Longest Road.";
            }
        }

        return "Observe the board and plan your next move.";
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
