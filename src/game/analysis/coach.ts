import { GameState } from '../types';
import { getVerticesForHex } from '../hexUtils';
import { isValidSettlementLocation } from '../rules/placement';
import { getPips } from '../mechanics/scoring';

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

const TERRAIN_TO_RESOURCE: Record<string, string> = {
    'Forest': 'wood',
    'Hills': 'brick',
    'Pasture': 'sheep',
    'Fields': 'wheat',
    'Mountains': 'ore'
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
            const hex = this.G.board.hexes[hId];
            if (hex && hex.terrain && TERRAIN_TO_RESOURCE[hex.terrain]) {
                resources.push(TERRAIN_TO_RESOURCE[hex.terrain]);
            }
        });
        return resources;
    }

    private calculatePipsForVertex(vertexId: string): number {
        const hexIds = vertexId.split('::');
        let pips = 0;

        hexIds.forEach(hId => {
            const hex = this.G.board.hexes[hId];
            if (hex && hex.terrain !== 'Desert' && hex.terrain !== 'Sea') {
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
        const hexes = this.G.board.hexes;

        // 1. Calculate Scarcity Map
        const scarcityMap = this.calculateScarcityMap();

        // 2. Identify Existing Resources
        const existingResources = this.getExistingResources(playerID);

        // 3. Identify all candidates (all vertices on board)
        const candidates = new Set<string>();
        Object.values(hexes).forEach(hex => {
            const vs = getVerticesForHex(hex.coords);
            vs.forEach(v => candidates.add(v));
        });

        // 4. Score candidates
        candidates.forEach(vId => {
            // Use centralized validation rule
            if (!isValidSettlementLocation(this.G, vId)) return;

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
                    scarcityMap[resource] = true;
                }
            });
        }
        return scarcityMap;
    }

    private getExistingResources(playerID: string): Set<string> {
        const player = this.G.players[playerID];
        const existingResources = new Set<string>();

        if (player.settlements.length >= 1) {
            player.settlements.forEach(sVId => {
                const res = this.getResourcesForVertex(sVId);
                res.forEach(r => existingResources.add(r));
            });
        }
        return existingResources;
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
        const settlementCount = this.G.players[playerID].settlements.length;

        let score = pips;
        const reasons: string[] = [`${pips} Pips`];
        const details = {
            pips: pips,
            scarcityBonus: false,
            scarceResources: [] as string[],
            diversityBonus: false,
            synergyBonus: false,
            neededResources: [] as string[]
        };

        // 1. Scarcity Multiplier
        const scarceResources = [...uniqueResources].filter(r => scarcityMap[r]);
        if (scarceResources.length > 0) {
            score *= this.config.scarcityMultiplier;
            details.scarcityBonus = true;
            details.scarceResources = scarceResources;
            reasons.push('Scarcity Bonus');
        }

        // 2. Diversity Multiplier
        if (uniqueResources.size === 3 && resources.length === 3) {
            score *= this.config.diversityMultiplier;
            details.diversityBonus = true;
            reasons.push('Diversity Bonus');
        }

        // 3. Synergy / Needs
        if (settlementCount === 0) {
            const hasWood = resources.includes('wood');
            const hasBrick = resources.includes('brick');
            const hasOre = resources.includes('ore');
            const hasWheat = resources.includes('wheat');

            if ((hasWood && hasBrick) || (hasOre && hasWheat)) {
                score += this.config.synergyBonus;
                details.synergyBonus = true;
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
                details.neededResources = newResources.sort();
                reasons.push(`Balances Economy (Added ${newResources.join(', ')})`);
            }
        }

        return {
            vertexId: vertexId,
            score: Math.round(score * 10) / 10,
            reason: reasons.join(', '),
            details: details
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
