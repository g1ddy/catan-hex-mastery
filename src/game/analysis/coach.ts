import { GameState } from '../types';
import { getVerticesForHex } from '../hexUtils';

export interface CoachRecommendation {
    vertexId: string;
    score: number;
    reason?: string; // Kept for backward compatibility if needed, though we will generate tooltips
    details: {
        pips: number;
        scarcityBonus: boolean;
        scarceResources: string[];
        diversityBonus: boolean;
        synergyBonus: boolean;
        neededResources: string[];
    };
}

const SCARCITY_THRESHOLD = 0.10;
const SCARCITY_MULTIPLIER = 1.2;
const DIVERSITY_MULTIPLIER = 1.2;
const SYNERGY_BONUS = 2;
const NEED_BONUS = 5;

const TERRAIN_TO_RESOURCE: Record<string, string> = {
    'Forest': 'wood',
    'Hills': 'brick',
    'Pasture': 'sheep',
    'Fields': 'wheat',
    'Mountains': 'ore'
};

export function getBestSettlementSpots(G: GameState, playerID: string): CoachRecommendation[] {
    const recommendations: CoachRecommendation[] = [];
    const hexes = G.board.hexes;
    const vertices = G.board.vertices;
    const player = G.players[playerID];

    // Helper to get pips for a number
    const getPips = (num: number): number => {
        const map: Record<number, number> = {
            2:1, 12:1,
            3:2, 11:2,
            4:3, 10:3,
            5:4, 9:4,
            6:5, 8:5
        };
        return map[num] || 0;
    };

    // Calculate scarcity from G.boardStats (if available) or recalculate
    const totalPips = G.boardStats.totalPips;
    const totalBoardPips = Object.values(totalPips).reduce((a, b) => a + b, 0);
    const scarcityMap: Record<string, boolean> = {};

    if (totalBoardPips > 0) {
        Object.entries(totalPips).forEach(([resource, pips]) => {
            if (pips / totalBoardPips < SCARCITY_THRESHOLD) {
                scarcityMap[resource] = true;
            }
        });
    }

    // Determine current phase/needs for Synergy
    const settlementCount = player.settlements.length;
    const existingResources = new Set<string>();

    if (settlementCount === 1) {
        // Collect resources from the first settlement
        const s1VId = player.settlements[0];
        const s1HexIds = s1VId.split('::');
        s1HexIds.forEach(hid => {
            const h = hexes[hid];
            if (h && h.terrain && TERRAIN_TO_RESOURCE[h.terrain]) {
                 existingResources.add(TERRAIN_TO_RESOURCE[h.terrain]);
            }
        });
    }

    // Identify all valid spots
    const candidates = new Set<string>();
    Object.values(hexes).forEach(hex => {
        const vs = getVerticesForHex(hex.coords);
        vs.forEach(v => candidates.add(v));
    });

    candidates.forEach(vId => {
        // Skip if occupied
        if (vertices[vId]) return;

        // Skip if too close to another building (Distance Rule)
        const occupied = Object.keys(vertices);
        let tooClose = false;
        const thisV = vId.split('::');

        for (const occId of occupied) {
            const thatV = occId.split('::');
            let matchCount = 0;
            for(const h1 of thisV) {
                if(thatV.includes(h1)) matchCount++;
            }
            if (matchCount >= 2) {
                tooClose = true;
                break;
            }
        }
        if (tooClose) return;

        // Score the vertex
        let pips = 0;
        const resources: string[] = [];

        thisV.forEach(coordStr => {
            // Find the hex with these coords
            const hex = hexes[coordStr];

            if (hex && hex.terrain !== 'Desert' && hex.terrain !== 'Sea') {
                const hexPips = getPips(hex.tokenValue || 0);
                pips += hexPips;

                // Map terrain to resource
                const res = TERRAIN_TO_RESOURCE[hex.terrain];
                if (res) resources.push(res);
            }
        });

        // Base Score = Pips
        let score = pips;
        const details = {
            pips: pips,
            scarcityBonus: false,
            scarceResources: [] as string[],
            diversityBonus: false,
            synergyBonus: false,
            neededResources: [] as string[]
        };

        const reasons: string[] = [`${pips} Pips`];

        // 1. Scarcity Multiplier
        let hasScarcity = false;
        const scarceResources: string[] = [];
        resources.forEach(r => {
            if (scarcityMap[r]) {
                hasScarcity = true;
                if (!scarceResources.includes(r)) scarceResources.push(r);
            }
        });
        if (hasScarcity) {
            score *= SCARCITY_MULTIPLIER;
            details.scarcityBonus = true;
            details.scarceResources = scarceResources;
            reasons.push('Scarcity Bonus');
        }

        // 2. Diversity Multiplier
        // Check if resources are unique
        const uniqueResources = new Set(resources);
        if (uniqueResources.size === 3 && resources.length === 3) {
            score *= DIVERSITY_MULTIPLIER;
            details.diversityBonus = true;
            reasons.push('Diversity Bonus');
        }

        // 3. Synergy / Needs
        if (settlementCount === 0) {
            // Static Synergy
            const hasWood = resources.includes('wood');
            const hasBrick = resources.includes('brick');
            const hasOre = resources.includes('ore');
            const hasWheat = resources.includes('wheat');

            if ((hasWood && hasBrick) || (hasOre && hasWheat)) {
                score += SYNERGY_BONUS;
                details.synergyBonus = true;
                reasons.push('Synergy');
            }
        } else if (settlementCount === 1) {
            // "One of Everything" Logic
            // For each resource this spot provides...
            const newResources: string[] = [];
            uniqueResources.forEach(r => {
                if (!existingResources.has(r)) {
                    score += NEED_BONUS;
                    newResources.push(r);
                }
            });

            if (newResources.length > 0) {
                // Sort for deterministic output
                details.neededResources = newResources.sort();
                reasons.push(`Balances Economy (Added ${newResources.join(', ')})`);
            }
        }

        recommendations.push({
            vertexId: vId,
            score: Math.round(score * 10) / 10, // Round to 1 decimal
            reason: reasons.join(', '), // Keep for compatibility if needed
            details: details
        });
    });

    // Sort by score desc
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 3);
}
