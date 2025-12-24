import { GameState, TERRAIN_CONFIG, PlacementScore, CoachFeedback } from '../types';
import { getVerticesForHex, getVertexNeighbors } from '../hexUtils';
import { calculatePipCount, getScarcityMap, PIP_MAP } from './pips';

function getResourcesForVertex(G: GameState, vertexId: string): string[] {
    const hexCoordsStrings = vertexId.split('::');
    const resources: string[] = [];

    hexCoordsStrings.forEach(coordStr => {
        const hex = G.board.hexes[coordStr];
        if (hex) {
            const res = TERRAIN_CONFIG[hex.terrain];
            if (res) {
                resources.push(res);
            }
        }
    });
    return resources;
}

function getPipsForVertex(G: GameState, vertexId: string): number {
    const hexCoordsStrings = vertexId.split('::');
    let pips = 0;

    hexCoordsStrings.forEach(coordStr => {
        const hex = G.board.hexes[coordStr];
        if (hex && hex.tokenValue) {
            pips += PIP_MAP[hex.tokenValue] || 0;
        }
    });
    return pips;
}

function hasSynergy(resources: string[]): boolean {
    const has = (r: string) => resources.includes(r);
    // (Brick+Wood) OR (Ore+Wheat)
    const roadSynergy = has('brick') && has('wood');
    const citySynergy = has('ore') && has('wheat');
    return roadSynergy || citySynergy;
}

// Distance rule check helper (reused logic)
function isValidSettlement(G: GameState, vertexId: string): boolean {
    if (G.board.vertices[vertexId]) return false;

    // Check neighbors
    for (const nId of getVertexNeighbors(vertexId)) {
        if (G.board.vertices[nId]) return false;
    }
    return true;
}

// Main Coach Function
export function getBestPlacements(G: GameState): PlacementScore[] {
    const validPlacements: PlacementScore[] = [];
    const { totalPips, totalBoardPips } = calculatePipCount(G.board.hexes);
    const scarcityMap = getScarcityMap(totalPips, totalBoardPips);

    const allVertices = new Set<string>();
    Object.values(G.board.hexes).forEach(hex => {
        const vs = getVerticesForHex(hex.coords);
        vs.forEach(v => allVertices.add(v));
    });

    allVertices.forEach(vId => {
        if (!isValidSettlement(G, vId)) return;

        const pips = getPipsForVertex(G, vId);
        const resources = getResourcesForVertex(G, vId);

        let scarcityMultiplier = 1.0;

        const hasScarceResource = resources.some(r => scarcityMap[r]);
        if (hasScarceResource) {
            scarcityMultiplier = 1.2;
        }

        const synergy = hasSynergy(resources) ? 2 : 0;

        const score = (pips * scarcityMultiplier) + synergy;

        validPlacements.push({
            vertexId: vId,
            score,
            totalPips: pips,
            synergyBonus: synergy,
            scarcityBonus: hasScarceResource
        });
    });

    return validPlacements.sort((a, b) => b.score - a.score);
}

export function evaluatePlacement(G: GameState, vertexId: string): CoachFeedback {
    // 1. Calculate Score for user's pick

    const { totalPips, totalBoardPips } = calculatePipCount(G.board.hexes);
    const scarcityMap = getScarcityMap(totalPips, totalBoardPips);

    const pips = getPipsForVertex(G, vertexId);
    const resources = getResourcesForVertex(G, vertexId);
    const hasScarceResource = resources.some(r => scarcityMap[r]);
    const scarcityMultiplier = hasScarceResource ? 1.2 : 1.0;
    const synergy = hasSynergy(resources) ? 2 : 0;
    const userScore = (pips * scarcityMultiplier) + synergy;

    // 2. Get Best Placements

    // Note: If evaluatePlacement is called BEFORE placement, `vertexId` is valid and will be in `getBestPlacements`.
    // If called AFTER, `vertexId` is occupied and won't be returned.

    const bestAlternatives = getBestPlacements(G);

    const maxAlternativeScore = bestAlternatives.length > 0 ? bestAlternatives[0].score : 0;
    const maxPossibleScore = Math.max(userScore, maxAlternativeScore);
    const bestSpotId = bestAlternatives.length > 0 ? bestAlternatives[0].vertexId : undefined;

    // Logic:
    // If UserScore >= MaxPossibleScore - 1: "Great Pick!"
    // Otherwise: "Better Spot Available"

    const threshold = maxPossibleScore - 1;
    let quality: 'good' | 'bad' = 'bad';
    let message = '';

    if (userScore >= threshold) {
        quality = 'good';
        message = `Great pick! (${Math.round(userScore)} pts)`;
    } else {
        quality = 'bad';
        message = `Missed Opportunity. Best: ${Math.round(maxPossibleScore)} pts.`;
    }

    return {
        score: userScore,
        maxScore: maxPossibleScore,
        quality,
        message,
        bestSpotId: quality === 'bad' ? bestSpotId : undefined,
        placements: bestAlternatives.slice(0, 3) // Return top 3 for hints
    };
}
