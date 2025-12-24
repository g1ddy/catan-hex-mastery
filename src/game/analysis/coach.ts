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
    // A vertex is defined by 3 hexes. We need to parse the ID or find the hexes.
    // The ID format is "q,r,s::q,r,s::q,r,s".
    const hexCoordsStrings = vertexId.split('::');
    const resources: string[] = [];

    hexCoordsStrings.forEach(coordStr => {
        // Find the hex in G.board.hexes.
        // Hex keys are typically "q,r,s" but let's be safe.
        // Actually, G.board.hexes is keyed by hex ID which is likely "q,r,s".
        // Let's check how hexes are keyed. Looking at boardGen.ts (or inference), keys are typically coordinates.
        // But let's look up by coordinate match to be robust, or assume key structure.
        // In Game.ts: hexesMap = Object.fromEntries(boardHexes.map(h => [h.id, h]));
        // In boardGen.ts: id: `${q},${r},${s}`

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
    // Replaced getVerticesForVertex with local helper because it is not exported from hexUtils
    // and I'm avoiding modifying shared utils for now to prevent scope creep.
    // const neighbors = getVerticesForVertex(vertexId);

    // Wait, getVerticesForVertex is not exported from hexUtils?
    // Let's check hexUtils again.
    // It has getVerticesForHex.
    // It has getEdgesForVertex.
    // It DOES NOT have getVerticesForVertex explicitly exported as such,
    // but I can write a helper here or check if I missed it.
    // I recall `getVertexNeighbors` in `moves/setup.ts`. I should probably export that logic or duplicate it.
    // For now, I'll rely on a local helper `getVertexNeighbors`.

    for (const nId of getVertexNeighbors(vertexId)) {
        if (G.board.vertices[nId]) return false;
    }
    return true;
}

// Helper to get neighbors of a vertex (vertices connected by an edge)
// Logic: A vertex is (H1, H2, H3). Neighbors are vertices that share an edge.
// Each pair (H1, H2) defines an edge. That edge connects two vertices.
// One is current, other is neighbor.
// Easier: parse coords, find hex neighbors, compute vertex IDs.
// Or just look at `moves/setup.ts` helper.
// I will reimplement `getVertexNeighbors` here to be self-contained or import if I refactor hexUtils.
// For now, let's look at `hexUtils.ts` again.

// Re-implementing getVertexNeighbors locally for now to avoid side-tracking.
function parseVertexId(id: string) {
    return id.split('::').map(s => {
        const [q, r, sCoords] = s.split(',').map(Number);
        return { q, r, s: sCoords };
    });
}

function getVertexNeighbors(vertexId: string): string[] {
    const hexes = parseVertexId(vertexId);
    // Neighbors are vertices that share 2 hexes with this vertex?
    // A vertex is corner of H1, H2, H3.
    // Neighbors are (H1, H2, H4), (H2, H3, H5), (H3, H1, H6).
    // Actually, simpler:
    // Vertex is adjacent to 3 edges. Each edge connects to another vertex.
    // Edge (H1, H2) connects Vertex(H1, H2, H3) and Vertex(H1, H2, H_other).

    // Let's use `getVerticesForHex` method.
    // For each hex in the vertex, get all its vertices.
    // The neighbors are the vertices that appear in the lists but are not the current vertex,
    // AND share 2 hexes with the current vertex.

    // Better yet: existing logic in `moves/setup.ts` works.
    // "pairs" logic: (H1,H2), (H2,H3), (H3,H1).
    // For pair (H1,H2), there are 2 vertices. One is `vertexId`. The other is neighbor.

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

    // Iterate over all possible vertices.
    // Since we don't have a master list of vertices in G, we can derive them from hexes.
    // A Set to avoid duplicates.
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
        // Logic: "Multiply score by 1.2 if the resource is rare"
        // If ANY resource is rare? Or applied per resource?
        // Requirement: "Multiply score by 1.2 if the resource is rare on the current map"
        // This implies if the vertex gives access to a rare resource.
        // If it gives access to 2 rare resources, is it 1.2 * 1.2? Or just 1.2?
        // Let's assume: if *any* resource is scarce, multiply by 1.2.

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

    // Sort descending by score
    return validPlacements.sort((a, b) => b.score - a.score);
}

export function evaluatePlacement(G: GameState, vertexId: string): CoachFeedback {
    // 1. Calculate Score for user's pick
    // Note: We need to calculate this *as if* the board was in the state *before* the move?
    // Or is this called *after* the move?
    // If called AFTER the move, `isValidSettlement` would return false for the spot itself.
    // So we should calculate score for the vertex regardless of validity (assuming it was just placed).

    // Calculate stats same as getBestPlacements
    const { totalPips, totalBoardPips } = calculatePipCount(G.board.hexes);
    const scarcityMap = getScarcityMap(totalPips, totalBoardPips);

    const pips = getPipsForVertex(G, vertexId);
    const resources = getResourcesForVertex(G, vertexId);
    const hasScarceResource = resources.some(r => scarcityMap[r]);
    const scarcityMultiplier = hasScarceResource ? 1.2 : 1.0;
    const synergy = hasSynergy(resources) ? 2 : 0;
    const userScore = (pips * scarcityMultiplier) + synergy;

    // 2. Get Best Placements
    // We must ignore the current placement for the purpose of finding "what was best".
    // Actually, if we just placed it, `getBestPlacements` will see it as occupied.
    // So we need to temporarily "unoccupy" it or handle it?
    // Or we can just calculate `userScore` and assume `getBestPlacements` finds the *next* best if occupied?
    // No, we want to compare against the *absolute* best at that moment.

    // Hack: We can temporarily remove the settlement from G.board.vertices to run the check?
    // Better: `getBestPlacements` checks `isValidSettlement`.
    // If we call this AFTER the move, `vertexId` is occupied.
    // So `getBestPlacements` will not return `vertexId`.
    // It will return the *next* best options.
    // BUT we want to know if `vertexId` WAS the best option.
    // So we should manually add `vertexId` to the list of candidates in our comparison logic,
    // OR we run `getBestPlacements` *ignoring* the current vertex's occupancy.

    // Let's create a specialized version or modify `getBestPlacements` to accept an ignore list?
    // Or just manually calculate score for `vertexId` (done) and compare it with `getBestPlacements` (which excludes `vertexId`).
    // If `userScore` > `bestAlternative`, then user picked the best (or tied).

    const bestAlternatives = getBestPlacements(G);
    // bestAlternatives excludes the current spot because it is now occupied.

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
