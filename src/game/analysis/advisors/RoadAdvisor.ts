import { GameState } from '../../core/types';
import { CoachRecommendation } from '../types';
import { SpatialAdvisor } from './SpatialAdvisor';
import { calculatePlayerPotentialPips } from '../analyst';
import { getVerticesForEdge, getEdgesForVertex } from '../../geometry/hexUtils';
import { validateSettlementLocation } from '../../rules/spatial';

const PORT_RESOURCE_MULTIPLIER = 2.0;
const PORT_GENERIC_MULTIPLIER = 0.5;
const MAX_DEPTH = 6; // Max road segments to look ahead
const SETTLEMENT_SECONDARY_SCORE_MULTIPLIER = 0.5;

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
            const significantTargets = this.findSignificantTargets(startEdge, playerID, playerProduction);

            significantTargets.forEach(target => {
                if (target.rawScore > 0) {
                    recommendations.push({
                        edgeId: startEdge,
                        score: target.rawScore, // Initially return raw score (decay handled by consumer)
                        reason: target.reason,
                        details: {
                            pips: 0, // Not relevant for road
                            distance: target.distance,
                            rawScore: target.rawScore,
                            scarcityBonus: false,
                            scarceResources: [],
                            diversityBonus: false,
                            synergyBonus: false,
                            neededResources: []
                        }
                    });
                }
            });
        }

        return recommendations.sort((a, b) => b.score - a.score);
    }

    // Made public for testing
    // Modified to return a list of significant targets (e.g. best per branch/distance)
    public findSignificantTargets(startEdge: string, playerID: string, playerProduction: Record<string, number>) {
        const significantTargets: { rawScore: number, distance: number, reason: string }[] = [];

        // Track best score found so far to filter out redundant weak targets further away?
        // Actually, sometimes a weaker target further away is NOT redundant if it's different.
        // But for simplification, let's collect ALL valid targets, then maybe filter?
        // Or better: Collect the best target found at EACH distance.
        // Or simpler: Just return everything that has a score > 0.

        // To avoid exploding the list, let's return:
        // 1. The highest scoring target overall.
        // 2. Any target closer than the best one that has a "decent" score (e.g. > 50% of best).
        // 3. Or just all of them. Let's try all non-zero targets.

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
                let isSettlementLocationValid = false;
                try {
                    const validity = validateSettlementLocation(this.G, vId);
                    isSettlementLocationValid = validity.isValid;
                } catch (e) {
                    console.warn(`RoadAdvisor: Error validating vertex ${vId}`, e);
                }

                if (isSettlementLocationValid) {
                    let currentScore = 0;
                    let currentReason = '';

                    // Port Score
                    const portScore = this.getPortScore(vId, playerID, playerProduction);
                    if (portScore) {
                        currentScore = portScore.score;
                        currentReason = portScore.reason;
                    }

                    // Settlement Score
                    try {
                        const rec = this.spatialAdvisor.scoreVertex(vId, playerID);
                        if (rec.score > currentScore) {
                            currentScore = Math.max(currentScore, rec.score);
                            currentReason = rec.reason;
                        } else if (rec.score > 0) {
                             currentScore += rec.score * SETTLEMENT_SECONDARY_SCORE_MULTIPLIER;
                             currentReason += ' + Settlement';
                        }
                    } catch (e) {
                        if (e instanceof Error && e.message !== 'Invalid playerID') {
                            console.warn(`RoadAdvisor: Error scoring vertex ${vId}`, e);
                        }
                    }

                    if (currentScore > 0) {
                        // Push to results
                        significantTargets.push({
                            rawScore: currentScore,
                            distance: dist,
                            reason: `${currentReason} (${dist} hop${dist > 1 ? 's' : ''})`
                        });
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

        // Post-processing: Filter to keep only "Pareto optimal" targets?
        // A target is dominated if there exists another target that is Closer AND Better.
        // If T1 is (Dist 2, Score 10) and T2 is (Dist 4, Score 15) -> Both kept.
        // If T1 is (Dist 2, Score 20) and T2 is (Dist 4, Score 15) -> T2 is dominated (Further and Worse).

        // Sort by distance (ascending)
        significantTargets.sort((a, b) => a.distance - b.distance);

        const filteredTargets: typeof significantTargets = [];
        let maxScoreSoFar = -1;

        for (const target of significantTargets) {
            // Keep it if it offers a better score than anything closer
            if (target.rawScore > maxScoreSoFar) {
                filteredTargets.push(target);
                maxScoreSoFar = target.rawScore;
            }
        }

        return filteredTargets;
    }
}
