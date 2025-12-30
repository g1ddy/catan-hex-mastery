import { GameState } from '../types';
import { getVerticesForHex } from '../hexUtils';

export interface CoachRecommendation {
    vertexId: string;
    score: number;
    reason: string;
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

/**
 * Calculates scores for all valid settlement spots on the board.
 */
export function getAllSettlementScores(G: GameState, playerID: string): CoachRecommendation[] {
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
        // The vertex ID might be stored. We need to parse it to find adjacent hexes.
        // We can reuse getHexesForVertex or parse manually.
        // Assuming hexUtils exports or we replicate logic.
        // Since getHexesForVertex returns IDs, we can look them up.
        // But getHexesForVertex is not imported. I'll need to update imports or parse manually.
        // Actually, vertexID is "h1::h2::h3".

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
        const reasons: string[] = [`${pips} Pips`];

        // 1. Scarcity Multiplier
        let hasScarcity = false;
        resources.forEach(r => {
            if (scarcityMap[r]) hasScarcity = true;
        });
        if (hasScarcity) {
            score *= SCARCITY_MULTIPLIER;
            reasons.push('Scarcity Bonus');
        }

        // 2. Diversity Multiplier
        // Check if resources are unique
        const uniqueResources = new Set(resources);
        if (uniqueResources.size === 3 && resources.length === 3) {
            score *= DIVERSITY_MULTIPLIER;
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
                reasons.push('Synergy');
            }
        } else if (settlementCount === 1) {
            // "One of Everything" Logic
            // For each resource this spot provides...
            // Note: If duplicate types in this spot (e.g. 2 Ore), do we add +5 twice if we need Ore?
            // Clarification was: "+5 points PER missing resource type acquired."
            // "A spot with Ore gets +5."
            // "A spot with Ore AND Wheat gets +10."
            // It implies per TYPE.

            // So we iterate the unique resources this spot provides.
            const newResources: string[] = [];
            uniqueResources.forEach(r => {
                if (!existingResources.has(r)) {
                    score += NEED_BONUS;
                    newResources.push(r);
                }
            });

            if (newResources.length > 0) {
                // Sort for deterministic output
                reasons.push(`Balances Economy (Added ${newResources.sort().join(', ')})`);
            }
        }

        recommendations.push({
            vertexId: vId,
            score: Math.round(score * 10) / 10, // Round to 1 decimal
            reason: reasons.join(', ')
        });
    });

    return recommendations;
}

export function getBestSettlementSpots(G: GameState, playerID: string): CoachRecommendation[] {
    const allScores = getAllSettlementScores(G, playerID);
    // Sort by score desc and take top 3
    return allScores.sort((a, b) => b.score - a.score).slice(0, 3);
}

/**
 * Returns a color string (HSL) interpolating between Red (Low), Yellow (Mid), and Green (High).
 * @param score The score to map.
 * @param min The minimum score in the range (corresponds to Red).
 * @param max The maximum score in the range (corresponds to Green).
 */
export function getHeatmapColor(score: number, min: number, max: number): string {
    if (min === max) return 'hsl(120, 100%, 50%)'; // Default Green if no range

    // Normalize score between 0 and 1
    let ratio = (score - min) / (max - min);
    ratio = Math.max(0, Math.min(1, ratio)); // Clamp

    // Interpolate Hue: 0 (Red) -> 60 (Yellow) -> 120 (Green)
    const hue = ratio * 120;

    return `hsl(${hue}, 100%, 50%)`;
}
