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

interface RoadTarget {
    rawScore: number;
    distance: number;
    reason: string;
}

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

        for (const startEdge of validRoadEdges) {
            const significantTargets = this.findSignificantTargets(startEdge, playerID, playerProduction);

            significantTargets.forEach(target => {
                if (target.rawScore > 0) {
                    recommendations.push({
                        edgeId: startEdge,
                        score: target.rawScore,
                        reason: target.reason,
                        details: {
                            pips: 0,
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

    /**
     * Refactored to use BFS helper and filtering.
     * Made public for testing.
     */
    public findSignificantTargets(startEdge: string, playerID: string, playerProduction: Record<string, number>): RoadTarget[] {
        const allTargets = this.bfsFindTargets(startEdge, playerID, playerProduction);
        return this.filterParetoOptimalTargets(allTargets);
    }

    private scoreTargetVertex(vertexId: string, playerID: string, playerProduction: Record<string, number>): { score: number, reason: string } | null {
        let currentScore = 0;
        let currentReason = '';

        // Port Score
        const portScore = this.getPortScore(vertexId, playerID, playerProduction);
        if (portScore) {
            currentScore = portScore.score;
            currentReason = portScore.reason;
        }

        // Settlement Score
        try {
            const rec = this.spatialAdvisor.scoreVertex(vertexId, playerID);
            if (rec.score > currentScore) {
                currentScore = Math.max(currentScore, rec.score);
                currentReason = rec.reason;
            } else if (rec.score > 0) {
                 currentScore += rec.score * SETTLEMENT_SECONDARY_SCORE_MULTIPLIER;
                 currentReason += ' + Settlement';
            }
        } catch (e) {
            // Ignore expected errors during speculative scoring
            if (e instanceof Error && e.message.endsWith('not found')) {
                console.warn(`RoadAdvisor: Error scoring vertex ${vertexId}`, e);
            }
        }

        if (currentScore > 0) {
            return { score: currentScore, reason: currentReason };
        }
        return null;
    }

    private bfsFindTargets(startEdge: string, playerID: string, playerProduction: Record<string, number>): RoadTarget[] {
        const targets: RoadTarget[] = [];
        const queue: { vId: string, dist: number }[] = [];
        const visited = new Set<string>();
        let head = 0;

        const endpoints = getVerticesForEdge(startEdge);
        endpoints.forEach(v => {
            queue.push({ vId: v, dist: 1 });
            visited.add(v);
        });

        while (head < queue.length) {
            const { vId, dist } = queue[head++];

            const vertex = this.G.board.vertices[vId];
            const owner = vertex?.owner;

            // Block check: If occupied by opponent, we can't pass through AND we can't build here.
            if (owner && owner !== playerID) {
                continue;
            }

            // Evaluation: If it's a valid empty spot, score it.
            if (!owner) {
                let isSettlementLocationValid = false;
                try {
                    const validity = validateSettlementLocation(this.G, vId);
                    isSettlementLocationValid = validity.isValid;
                } catch (e) {
                    console.warn(`RoadAdvisor: Error validating vertex ${vId}`, e);
                }

                if (isSettlementLocationValid) {
                    const scoreResult = this.scoreTargetVertex(vId, playerID, playerProduction);
                    if (scoreResult) {
                        targets.push({
                            rawScore: scoreResult.score,
                            distance: dist,
                            reason: `${scoreResult.reason} (${dist} hop${dist > 1 ? 's' : ''})`
                        });
                    }
                }
            }

            // Expansion: If within depth, add neighbors
            if (dist < MAX_DEPTH) {
                const adjEdges = getEdgesForVertex(vId);
                for (const eId of adjEdges) {
                    if (eId === startEdge) continue; // Don't look back at start

                    const edge = this.G.board.edges[eId];
                    if (edge) continue; // Occupied edge

                    const vIds = getVerticesForEdge(eId);
                    const nextV = vIds.find(v => v !== vId);

                    if (nextV && !visited.has(nextV)) {
                        visited.add(nextV);
                        queue.push({ vId: nextV, dist: dist + 1 });
                    }
                }
            }
        }

        return targets;
    }

    private filterParetoOptimalTargets(targets: RoadTarget[]): RoadTarget[] {
        // Sort by distance (ascending)
        targets.sort((a, b) => a.distance - b.distance);

        const filtered: RoadTarget[] = [];
        let maxScoreSoFar = -1;

        for (const target of targets) {
            // Keep it if it offers a better score than anything closer
            if (target.rawScore > maxScoreSoFar) {
                filtered.push(target);
                maxScoreSoFar = target.rawScore;
            }
        }
        return filtered;
    }
}
