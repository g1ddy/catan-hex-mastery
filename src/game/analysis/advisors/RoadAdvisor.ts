import { GameState } from '../../core/types';
import { CoachRecommendation } from '../types';
import { SpatialAdvisor } from './SpatialAdvisor';
import { calculatePlayerPotentialPips } from '../analyst';
import { getVerticesForEdge, getEdgesForVertex } from '../../geometry/hexUtils';

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

        const playerProduction = calculatePlayerPotentialPips(this.G)[playerID] || {};

        // 2. Evaluate each candidate road
        for (const startEdge of validRoadEdges) {
            const bestTarget = this.findBestTarget(startEdge, playerID, playerProduction);

            if (bestTarget.score > 0) {
                recommendations.push({
                    edgeId: startEdge,
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
        let maxScore = 0;
        let bestReason = '';

        // Optimized BFS: Queue implementation using pointer for O(1) dequeue
        const queue: { vId: string, dist: number }[] = [];
        let head = 0;
        const visited = new Set<string>();

        const endpoints = getVerticesForEdge(startEdge);
        endpoints.forEach(v => {
            queue.push({ vId: v, dist: 1 }); // Reaching this vertex takes 1 road (the startEdge)
            visited.add(v);
        });

        while (head < queue.length) {
            const { vId, dist } = queue[head++];

            // 1. Evaluate this Vertex as a Target
            const vertex = this.G.board.vertices[vId];
            const owner = vertex?.owner;

            // Block check: If occupied by opponent, we can't pass through AND we can't build here.
            if (owner && owner !== playerID) {
                continue;
            }

            // If it's valid spot (Empty), score it.
            if (!owner) {
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
                    // Log error only if it's unexpected (e.g. not just invalid player)
                    if (e instanceof Error && e.message !== 'Invalid playerID') {
                        console.warn(`RoadAdvisor: Error scoring vertex ${vId}`, e);
                    }
                }
            }

            // 2. Expand Search (if within depth)
            if (dist < MAX_DEPTH) {
                // Get adjacent edges
                const adjEdges = getEdgesForVertex(vId);
                for (const eId of adjEdges) {
                    // Don't go back to startEdge
                    if (eId === startEdge) continue;

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
