import { GameState } from '../types';
import { getVerticesForHex } from '../hexUtils';

interface CoachRecommendation {
    vertexId: string;
    score: number;
    reason: string;
}

const SCARCITY_THRESHOLD = 0.10;
const SCARCITY_MULTIPLIER = 1.2;
const SYNERGY_BONUS = 2;

const TERRAIN_TO_RESOURCE: Record<string, string> = {
    'Forest': 'wood',
    'Hills': 'brick',
    'Pasture': 'sheep',
    'Fields': 'wheat',
    'Mountains': 'ore'
};

export function getBestSettlementSpots(G: GameState, _playerID: string): CoachRecommendation[] {
    const recommendations: CoachRecommendation[] = [];
    const hexes = G.board.hexes;
    const vertices = G.board.vertices;

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

    // Identify all valid spots (simplified: check all vertices, then filter by validity)
    // Since we don't have a direct "valid vertices" list, we iterate all hex corners.
    // To avoid duplicates, we use a Set.
    const candidates = new Set<string>();
    Object.values(hexes).forEach(hex => {
        const vs = getVerticesForHex(hex.coords);
        vs.forEach(v => candidates.add(v));
    });

    candidates.forEach(vId => {
        // Skip if occupied
        if (vertices[vId]) return;

        // Skip if too close to another building (Distance Rule)
        // Note: The caller (Board.tsx) usually handles validity, but for Coach we need to pre-filter.
        // We replicate the 'isTooClose' logic here or rely on the visual highlighter to filter final display.
        // For performance, we'll do a quick check.
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
        let score = 0;
        let pips = 0;
        const resources: string[] = [];

        thisV.forEach(coordStr => {
            const [q, r, s] = coordStr.split(',').map(Number);
            // Find the hex with these coords (inefficient linear search, but board is small)
            const hex = hexes[coordStr];

            if (hex && hex.terrain !== 'Desert' && hex.terrain !== 'Sea') {
                const hexPips = getPips(hex.tokenValue || 0);
                pips += hexPips;

                // Map terrain to resource
                const res = TERRAIN_TO_RESOURCE[hex.terrain];
                if (res) resources.push(res);
            }
        });

        score = pips;
        const reasons: string[] = [`${pips} Pips`];

        // Apply Scarcity
        let hasScarcity = false;
        resources.forEach(r => {
            if (scarcityMap[r]) hasScarcity = true;
        });
        if (hasScarcity) {
            score *= SCARCITY_MULTIPLIER;
            reasons.push('Scarcity Bonus');
        }

        // Apply Synergy
        const hasWood = resources.includes('wood');
        const hasBrick = resources.includes('brick');
        const hasOre = resources.includes('ore');
        const hasWheat = resources.includes('wheat');

        if ((hasWood && hasBrick) || (hasOre && hasWheat)) {
            score += SYNERGY_BONUS;
            reasons.push('Synergy');
        }

        recommendations.push({
            vertexId: vId,
            score: Math.round(score * 10) / 10, // Round to 1 decimal
            reason: reasons.join(', ')
        });
    });

    // Sort by score desc
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 3);
}
