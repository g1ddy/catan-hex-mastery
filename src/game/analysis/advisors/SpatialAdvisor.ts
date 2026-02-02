import { Ctx } from 'boardgame.io';
import { GameState, TerrainType } from '../../core/types';
import { getValidSetupSettlementSpots } from '../../rules/queries';
import { validateSettlementLocation } from '../../rules/spatial';
import { isValidPlayer } from '../../core/validation';
import { getPips } from '../../mechanics/scoring';
import { TERRAIN_TO_RESOURCE } from '../../mechanics/resources';
import { getHexesForVertex, getVerticesForEdge, getEdgesForVertex } from '../../geometry/hexUtils';
import { CoachRecommendation, CoachConfig } from '../coach';
import { safeGet } from '../../../game/core/utils/objectUtils';

export class SpatialAdvisor {
    private G: GameState;
    private config: CoachConfig;

    constructor(G: GameState, config: CoachConfig) {
        this.G = G;
        this.config = config;
    }

    private getVertexData(hexIds: string[]): { resources: string[], pips: number } {
        return hexIds.reduce((acc, hId) => {
            const hex = safeGet(this.G.board.hexes, hId);
            if (!hex) return acc;

            if (hex.terrain) {
                const res = TERRAIN_TO_RESOURCE[hex.terrain];
                if (res) {
                    acc.resources.push(res);
                }
            }

            if (hex.terrain !== TerrainType.Desert && hex.terrain !== TerrainType.Sea) {
                acc.pips += getPips(hex.tokenValue || 0);
            }

            return acc;
        }, { resources: [] as string[], pips: 0 });
    }

    private calculateScarcityMap(): Record<string, boolean> {
        const totalPips = this.G.boardStats.totalPips;
        const totalBoardPips = Object.values(totalPips).reduce((a, b) => a + b, 0);
        const scarcityMap: Record<string, boolean> = {};

        if (totalBoardPips > 0) {
            Object.entries(totalPips).forEach(([resource, pips]) => {
                if (pips / totalBoardPips < this.config.scarcityThreshold) {
                    scarcityMap[resource] = true;
                }
            });
        }
        return scarcityMap;
    }

    private getExistingResources(playerID: string): Set<string> {
        if (!isValidPlayer(playerID, this.G)) {
            return new Set<string>();
        }

        const player = safeGet(this.G.players, playerID);
        if (!player) return new Set<string>();
        const existingResources = new Set<string>();

        player.settlements.forEach(sVId => {
            const hexIds = getHexesForVertex(sVId);
            const { resources } = this.getVertexData(hexIds);
            resources.forEach(r => existingResources.add(r));
        });

        return existingResources;
    }

    private calculateScarcityScore(uniqueResources: Set<string>, scarcityMap: Record<string, boolean>) {
        const scarceResources = Array.from(uniqueResources).filter(r => scarcityMap[r]);
        const bonus = scarceResources.length > 0;
        return {
            multiplier: bonus ? this.config.scarcityMultiplier : 1,
            bonus,
            resources: scarceResources,
            reason: bonus ? 'Scarcity Bonus' : ''
        };
    }

    private calculateDiversityScore(resources: string[], uniqueResources: Set<string>) {
        const bonus = uniqueResources.size === 3 && resources.length === 3;
        return {
            multiplier: bonus ? this.config.diversityMultiplier : 1,
            bonus,
            reason: bonus ? 'Diversity Bonus' : ''
        };
    }

    private calculateSynergyScore(
        resources: string[],
        uniqueResources: Set<string>,
        settlementCount: number,
        existingResources: Set<string>
    ) {
        let score = 0;
        let synergyBonus = false;
        const neededResources: string[] = [];
        const reasons: string[] = [];

        if (settlementCount === 0) {
            if ((resources.includes('wood') && resources.includes('brick')) ||
                (resources.includes('ore') && resources.includes('wheat'))) {
                score += this.config.synergyBonus;
                synergyBonus = true;
                reasons.push('Synergy');
            }
        } else {
            const newResources = Array.from(uniqueResources).filter(r => !existingResources.has(r));
            if (newResources.length > 0) {
                score += this.config.needBonus * newResources.length;
                neededResources.push(...newResources.sort());
                reasons.push(`Balances Economy (Added ${newResources.join(', ')})`);
            }
        }

        return { score, synergyBonus, neededResources, reasons };
    }

    public scoreVertex(
        vertexId: string,
        playerID: string,
        scarcityMap?: Record<string, boolean>,
        existingResources?: Set<string>
    ): CoachRecommendation {
        if (!isValidPlayer(playerID, this.G)) {
             throw new Error(`Player ${playerID} not found`);
        }

        const map = scarcityMap || this.calculateScarcityMap();
        const resourcesSet = existingResources || this.getExistingResources(playerID);

        const hexIds = getHexesForVertex(vertexId);
        const { resources, pips } = this.getVertexData(hexIds);
        const uniqueResources = new Set(resources);
        const settlementCount = this.G.players[playerID].settlements.length;

        let score = pips;
        const reasons: string[] = [`${pips} Pips`];

        const scarcity = this.calculateScarcityScore(uniqueResources, map);
        if (scarcity.bonus) {
            score *= scarcity.multiplier;
            reasons.push(scarcity.reason);
        }

        const diversity = this.calculateDiversityScore(resources, uniqueResources);
        if (diversity.bonus) {
            score *= diversity.multiplier;
            reasons.push(diversity.reason);
        }

        const synergy = this.calculateSynergyScore(resources, uniqueResources, settlementCount, resourcesSet);
        score += synergy.score;
        reasons.push(...synergy.reasons);

        return {
            vertexId,
            score: Math.round(score * 10) / 10,
            reason: reasons.filter(Boolean).join(', '),
            details: {
                pips,
                scarcityBonus: scarcity.bonus,
                scarceResources: scarcity.resources,
                diversityBonus: diversity.bonus,
                synergyBonus: synergy.synergyBonus,
                neededResources: synergy.neededResources
            }
        };
    }

    public getAllSettlementScores(playerID: string, ctx: Ctx): CoachRecommendation[] {
        if (playerID !== ctx.currentPlayer) {
            return [];
        }

        const scarcityMap = this.calculateScarcityMap();
        const existingResources = this.getExistingResources(playerID);
        const candidates = getValidSetupSettlementSpots(this.G);

        return Array.from(candidates).map(vId => this.scoreVertex(vId, playerID, scarcityMap, existingResources));
    }

    public getBestCitySpots(playerID: string, ctx: Ctx, candidates: string[]): CoachRecommendation[] {
        if (playerID !== ctx.currentPlayer) {
            return [];
        }

        const scarcityMap = this.calculateScarcityMap();
        const existingResources = this.getExistingResources(playerID);

        const recommendations = candidates
            .map(vId => {
                if (typeof vId !== 'string' || vId.includes('__proto__') || vId.includes('constructor') || vId.includes('prototype')) return null;
                try {
                    return this.scoreVertex(vId, playerID, scarcityMap, existingResources);
                } catch (error) {
                    console.error(`Error scoring vertex ${vId}:`, error);
                    return null;
                }
            })
            .filter((r): r is CoachRecommendation => r !== null);

        return recommendations.sort((a, b) => b.score - a.score);
    }

    public getBestRoadSpots(playerID: string, ctx: Ctx, candidates: string[]): CoachRecommendation[] {
        if (playerID !== ctx.currentPlayer) {
            return [];
        }

        const scarcityMap = this.calculateScarcityMap();
        const existingResources = this.getExistingResources(playerID);
        const MAX_DEPTH = 3;

        // Cache for vertex scores
        const vertexScoreCache = new Map<string, number>();
        const getVertexScore = (vId: string) => {
             if (vertexScoreCache.has(vId)) return vertexScoreCache.get(vId)!;
             if (safeGet(this.G.board.vertices, vId)) { // Occupied
                 vertexScoreCache.set(vId, 0);
                 return 0;
             }
             // Valid location?
             const validation = validateSettlementLocation(this.G, vId);
             if (!validation.isValid) {
                 vertexScoreCache.set(vId, 0);
                 return 0;
             }
             const rec = this.scoreVertex(vId, playerID, scarcityMap, existingResources);
             vertexScoreCache.set(vId, rec.score);
             return rec.score;
        };

        return candidates.map(roadId => {
             let totalScore = 0;
             let reasonsSet = new Set<string>();

             // BFS
             const queue: { edgeId: string; dist: number }[] = [{ edgeId: roadId, dist: 0 }];
             const visitedEdges = new Set<string>([roadId]);
             const visitedVertices = new Set<string>();

             while (queue.length > 0) {
                 const { edgeId, dist } = queue.shift()!;
                 const endpoints = getVerticesForEdge(edgeId);

                 for (const vId of endpoints) {
                     // Check blockage by opponent vertex
                     const v = safeGet(this.G.board.vertices, vId);
                     if (v && v.owner !== playerID) continue;

                     if (!visitedVertices.has(vId)) {
                         visitedVertices.add(vId);

                         // Score Settlement Spot
                         const vScore = getVertexScore(vId);
                         if (vScore > 0) {
                             const discounted = vScore / (dist + 1);
                             totalScore += discounted;
                             reasonsSet.add(`Leads to settlement`);
                         }

                         // Score Port
                         const adjEdges = getEdgesForVertex(vId);
                         for (const eId of adjEdges) {
                             const port = safeGet(this.G.board.ports, eId);
                             if (port) {
                                 const portVal = port.type === '3:1' ? 2 : 4;
                                 totalScore += portVal / (dist + 1);
                                 reasonsSet.add(`Leads to ${port.type} Port`);
                             }
                         }
                     }

                     // Expand BFS
                     if (dist < MAX_DEPTH) {
                         const adjEdges = getEdgesForVertex(vId);
                         for (const nextEdgeId of adjEdges) {
                             if (!visitedEdges.has(nextEdgeId)) {
                                 // Check if edge is occupied by opponent?
                                 // If occupied by opponent, we can't build.
                                 const edge = safeGet(this.G.board.edges, nextEdgeId);
                                 if (edge && edge.owner !== playerID) {
                                     continue;
                                 }
                                 // If empty or ours, we can traverse?
                                 // Actually if it's ours, we already have access.
                                 // But we want to find NEW access.
                                 // So we only expand into empty edges.
                                 if (!edge) {
                                     visitedEdges.add(nextEdgeId);
                                     queue.push({ edgeId: nextEdgeId, dist: dist + 1 });
                                 }
                             }
                         }
                     }
                 }
             }

             return {
                 vertexId: roadId,
                 score: Math.round(totalScore * 10) / 10,
                 reason: Array.from(reasonsSet).slice(0, 3).join(', '),
                 details: {
                     pips: 0,
                     scarcityBonus: false,
                     scarceResources: [],
                     diversityBonus: false,
                     synergyBonus: false,
                     neededResources: []
                 }
             };
        }).sort((a, b) => b.score - a.score);
    }
}
