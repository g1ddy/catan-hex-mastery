import { GameState, TERRAIN_CONFIG } from '../types';
import { getVerticesForHex } from '../hexUtils';
import { calculatePipCount, getScarcityMap, PIP_MAP } from './pips';

export interface PlacementScore {
  vertexId: string;
  score: number;
  totalPips: number;
  synergyBonus: number;
  scarcityBonus: boolean;
}

export interface CoachFeedback {
  score: number;
  maxScore: number;
  quality: 'good' | 'bad';
  message: string;
  bestSpotId?: string;
  placements: PlacementScore[];
}

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

function parseVertexId(id: string) {
    return id.split('::').map(s => {
        const [q, r, sCoords] = s.split(',').map(Number);
        return { q, r, s: sCoords };
    });
}

function getVertexNeighbors(vertexId: string): string[] {
    const hexes = parseVertexId(vertexId);

    const neighbors: string[] = [];
    const pairs = [
        [hexes[0], hexes[1]],
        [hexes[1], hexes[2]],
        [hexes[2], hexes[0]]
    ];

    pairs.forEach(pair => {
       const vA = getVerticesForHex(pair[0]); // array of strings
       const vB = getVerticesForHex(pair[1]); // array of strings
       // Intersection of vA and vB gives the 2 vertices sharing this edge.
       const common = vA.filter(id => vB.includes(id));
       const n = common.find(id => id !== vertexId);
       if (n) neighbors.push(n);
    });

    return neighbors;
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
    const rankedPlacements = getBestPlacements(G);
    // rankedPlacements contains all valid placements, including the user's potential choice, sorted by score.

    const maxPossibleScore = rankedPlacements.length > 0 ? rankedPlacements[0].score : 0;
    const bestSpotId = rankedPlacements.length > 0 ? rankedPlacements[0].vertexId : undefined;

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
