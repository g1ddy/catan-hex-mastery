import { GameState, TerrainType } from '../types';
import { getValidSetupSettlementSpots } from '../rules/validator';
import { getPips } from '../mechanics/scoring';
import { TERRAIN_TO_RESOURCE } from '../mechanics/resources';

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

    private getResourcesForVertex(vertexId: string): string[] {
        const hexIds = vertexId.split('::');
        const resources: string[] = [];

        hexIds.forEach(hId => {
            // eslint-disable-next-line security/detect-object-injection
            const hex = this.G.board.hexes[hId];
            if (hex && hex.terrain) {
                const res = TERRAIN_TO_RESOURCE[hex.terrain];
                if (res) {
                    resources.push(res);
                }
            }
        });
        return resources;
    }

    private calculatePipsForVertex(vertexId: string): number {
        const hexIds = vertexId.split('::');
        let pips = 0;

        hexIds.forEach(hId => {
            // eslint-disable-next-line security/detect-object-injection
            const hex = this.G.board.hexes[hId];
            if (hex && hex.terrain !== TerrainType.Desert && hex.terrain !== TerrainType.Sea) {
                pips += getPips(hex.tokenValue || 0);
            }
        });
        return pips;
    }

    /**
     * Calculates scores for all valid settlement spots on the board.
     */
    public getAllSettlementScores(playerID: string): CoachRecommendation[] {
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
        const player = this.G.players[playerID]; // eslint-disable-line security/detect-object-injection
        const existingResources = new Set<string>();

        if (player.settlements.length >= 1) {
            player.settlements.forEach(sVId => {
                const res = this.getResourcesForVertex(sVId);
                res.forEach(r => existingResources.add(r));
            });
        }
        return existingResources;
    }

    private calculateScarcityScore(_resources: string[], uniqueResources: Set<string>, scarcityMap: Record<string, boolean>) {
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
        const pips = this.calculatePipsForVertex(vertexId);
        const resources = this.getResourcesForVertex(vertexId);
        const uniqueResources = new Set(resources);
        const settlementCount = this.G.players[playerID].settlements.length; // eslint-disable-line security/detect-object-injection

        let score = pips;
        const reasons: string[] = [`${pips} Pips`];

        // 1. Scarcity
        const scarcity = this.calculateScarcityScore(resources, uniqueResources, scarcityMap);
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

    public getBestSettlementSpots(playerID: string): CoachRecommendation[] {
        const allScores = this.getAllSettlementScores(playerID);
        return allScores.sort((a, b) => b.score - a.score).slice(0, 3);
    }
}

// --- Backward Compatibility Wrappers ---

export function getAllSettlementScores(G: GameState, playerID: string): CoachRecommendation[] {
    const coach = new Coach(G);
    return coach.getAllSettlementScores(playerID);
}

export function getBestSettlementSpots(G: GameState, playerID: string): CoachRecommendation[] {
    const coach = new Coach(G);
    return coach.getBestSettlementSpots(playerID);
}

export function getHeatmapColor(score: number, min: number, max: number): string {
    if (min === max) return 'hsl(120, 100%, 50%)';

    let ratio = (score - min) / (max - min);
    ratio = Math.max(0, Math.min(1, ratio));

    const hue = ratio * 120;
    return `hsl(${hue}, 100%, 50%)`;
}
