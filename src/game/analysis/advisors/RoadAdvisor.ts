import { GameState } from '../../core/types';
import { CoachRecommendation } from '../coach';
import { SpatialAdvisor } from './SpatialAdvisor';
import { calculatePlayerPotentialPips } from '../analyst';
import { getVerticesForEdge, getEdgesForVertex, getHexesForVertex } from '../../geometry/hexUtils';
import { safeGet } from '../../core/utils/objectUtils';
import { TERRAIN_TO_RESOURCE } from '../../mechanics/resources';

const DECAY_FACTOR = 0.8;
const PORT_RESOURCE_MULTIPLIER = 2.0;
const PORT_GENERIC_MULTIPLIER = 0.5;
const MAX_DEPTH = 6; // Max road segments to look ahead

export class RoadAdvisor {
    private G: GameState;
    private spatialAdvisor: SpatialAdvisor;

    constructor(G: GameState, spatialAdvisor: SpatialAdvisor) {
        this.G = G;
        this.spatialAdvisor = spatialAdvisor;
    }

    private getPortScore(vertexId: string, playerID: string, playerProduction: Record<string, number>): { score: number, reason: string } | null {
        const portId = Object.keys(this.G.board.ports).find(pId => {
            const port = this.G.board.ports[pId];
            return port.vertices.includes(vertexId);
        });

        if (!portId) return null;

        const port = this.G.board.ports[portId];
        // If we already own a port of this type, it's less valuable?
        // For simplicity, assume more access is redundant but maybe okay.
        // But if we own THIS port, we don't need to reach it.
        const vOwner = this.G.board.vertices[vertexId]?.owner;
        if (vOwner === playerID) return null; // Already reached/owned

        if (port.type === '3:1') {
            const totalProd = Object.values(playerProduction).reduce((a, b) => a + b, 0);
            return {
                score: totalProd * PORT_GENERIC_MULTIPLIER,
                reason: 'Leads to 3:1 Port'
            };
        } else if (port.type in playerProduction) {
            const prod = playerProduction[port.type] || 0;
            // Only valuable if we have production
            if (prod > 0) {
                 return {
                    score: prod * PORT_RESOURCE_MULTIPLIER,
                    reason: `Leads to ${port.type} Port`
                 };
            }
        }

        return null;
    }

    public getRoadRecommendations(playerID: string, validRoadEdges: string[]): CoachRecommendation[] {
        if (!validRoadEdges.length) return [];

        const recommendations: CoachRecommendation[] = [];

        // 1. Pre-calculate targets
        // Settlement Spots (using SpatialAdvisor to get scores for ALL valid spots)
        // We use getAllSettlementScores but we need to ensure we only consider 'vacant' ones as targets
        // actually getAllSettlementScores returns scores for ValidSetupSettlementSpots which are vacant.
        // However, we want strict gameplay validity (distance rule)?
        // No, for "reaching", we want to know if a spot is a good *candidate* for the future.
        // Even if it currently violates distance rule against *unbuilt* things?
        // No, validSetupSettlementSpots respects distance to *existing* buildings.
        // So these are valid places to build.
        // NOTE: We need to pass a context. We can mock one or just use G if SpatialAdvisor allows.
        // SpatialAdvisor.getAllSettlementScores requires ctx for currentPlayer check, but mostly relies on G.
        // We can manually call scoreVertex for specific spots found during BFS to avoid context mocking issues if we want.
        // Or better: SpatialAdvisor.scoreVertex is public.

        const playerProduction = calculatePlayerPotentialPips(this.G)[playerID] || {};

        // 2. Evaluate each candidate road
        for (const startEdge of validRoadEdges) {
            const bestTarget = this.findBestTarget(startEdge, playerID, playerProduction);

            if (bestTarget.score > 0) {
                recommendations.push({
                    vertexId: startEdge, // Using edgeId in vertexId field as per plan (or we will add edgeId field)
                    // We will handle the type mapping in the UI/Coach integration
                    score: bestTarget.score,
                    reason: bestTarget.reason,
                    details: {
                        pips: 0, // Not relevant for road
                        scarcityBonus: false,
                        scarceResources: [],
                        diversityBonus: false,
                        synergyBonus: false,
                        neededResources: []
                    }
                });
            }
        }

        return recommendations.sort((a, b) => b.score - a.score);
    }

    private findBestTarget(startEdge: string, playerID: string, playerProduction: Record<string, number>) {
        // BFS to find reachable targets
        // State: { vertexId, distance }
        // We start from the endpoints of the startEdge that are NOT connected to our existing road network?
        // No, we traverse *outwards* from the road we just built.
        // The startEdge has 2 vertices. One (or both) connects to our network. The other (or both) leads to new territory.
        // We should BFS from *both* endpoints, but treating the startEdge as the first step (Distance 0? No, Distance 1).
        // Actually, simpler: BFS on Edges.
        // Start Edge is Distance 0 (it's the one we are building).
        // Vertices touched by Start Edge are reachable at "End of this road".
        // If a Vertex has a target, Score = TargetScore * Decay^0 ?
        // If we consider the road *leads to* the vertex, then yes.

        // Queue: { edgeId, distance }?
        // Better: Queue of Vertices to explore?
        // Let's explore Vertices.
        // Initial Frontier: The 2 vertices of startEdge.
        // But we must respect "direction". We don't want to go back into our own network.
        // Actually, it doesn't matter. If we go back, we hit our own existing roads/buildings, which are not "new targets".
        // The only targets are *unclaimed* spots.
        // So BFS from both endpoints is fine.

        let maxScore = 0;
        let bestReason = '';

        const queue: { vId: string, dist: number }[] = [];
        const visited = new Set<string>();

        const endpoints = getVerticesForEdge(startEdge);
        endpoints.forEach(v => {
            queue.push({ vId: v, dist: 1 }); // Reaching this vertex takes 1 road (the startEdge)
            visited.add(v);
        });

        // Also mark other vertices of our network as visited to avoid backtracking?
        // Not strictly necessary if we only score *unowned* things, but good for optimization.
        // For now, simple visited set is enough.

        while (queue.length > 0) {
            const { vId, dist } = queue.shift()!;

            // 1. Evaluate this Vertex as a Target
            const vertex = this.G.board.vertices[vId];
            const owner = vertex?.owner;

            // Block check: If occupied by opponent, we can't pass through AND we can't build here.
            // But if we just *reached* it (dist > 0), and it's occupied, it's a "Wall".
            // We can't score it (it's not a valid target) and we can't extend from it.
            // So we stop this branch.
            if (owner && owner !== playerID) {
                continue;
            }

            // If it's valid spot (Empty), score it.
            if (!owner) {
                // Check if it's a valid settlement spot
                // We use a simplified check: is it empty? (Already checked !owner)
                // SpatialAdvisor.scoreVertex handles logic.
                // But we should only score it if it's a valid *placement* (Distance rule).
                // However, SpatialAdvisor might return score even if invalid?
                // Let's try scoring it.

                // Port Score
                const portScore = this.getPortScore(vId, playerID, playerProduction);
                if (portScore) {
                    const decayed = portScore.score * Math.pow(DECAY_FACTOR, dist - 1);
                    if (decayed > maxScore) {
                        maxScore = decayed;
                        bestReason = `${portScore.reason} (${dist} hop${dist > 1 ? 's' : ''})`;
                    }
                }

                // Settlement Score
                // We assume we can build here if we reach it.
                // Note: SpatialAdvisor.scoreVertex usually assumes setup or relies on queries.
                // We'll trust it returns a score based on pips/resources.
                try {
                    const rec = this.spatialAdvisor.scoreVertex(vId, playerID);
                    if (rec.score > 0) {
                         const decayed = rec.score * Math.pow(DECAY_FACTOR, dist - 1);
                         if (decayed > maxScore) {
                            maxScore = decayed;
                            bestReason = `${rec.reason} (${dist} hop${dist > 1 ? 's' : ''})`;
                         }
                    }
                } catch (e) {
                    // Ignore (e.g. invalid player)
                }
            }

            // 2. Expand Search (if within depth)
            if (dist < MAX_DEPTH) {
                // Get adjacent edges
                const adjEdges = getEdgesForVertex(vId);
                for (const eId of adjEdges) {
                    // Don't go back to startEdge
                    if (eId === startEdge) continue;

                    // Don't traverse existing roads (ours or others)
                    // Wait, if it's OUR road, we effectively already "reached" the other side, so distance shouldn't increase?
                    // But we are looking for *new* extensions.
                    // If we run into our own road, we've looped back. No new value there usually.
                    const edge = this.G.board.edges[eId];
                    if (edge) continue; // Occupied edge

                    // Find the other vertex
                    const vIds = getVerticesForEdge(eId);
                    const nextV = vIds.find(v => v !== vId);

                    if (nextV && !visited.has(nextV)) {
                        visited.add(nextV);
                        queue.push({ vId: nextV, dist: dist + 1 });
                    }
                }
            }
        }

        return { score: maxScore, reason: bestReason };
    }
}
