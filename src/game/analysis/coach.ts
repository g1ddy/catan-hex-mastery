import { GameState } from '../types';
import { getVerticesForHex, getVertexNeighbors, getEdgesForVertex, getVerticesForEdge } from '../hexUtils';

export interface CoachRecommendation {
    vertexId: string;
    score: number;
    reason: string;
    details: {
        pips: number;
        scarcityBonus: boolean;
        scarceResources: string[];
        diversityBonus: boolean;
        synergyBonus: boolean;
        neededResources: string[];
    };
}

export interface BotMove {
    move: string;
    args: any[];
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

export class Coach {
    private G: GameState;
    // We can add ctx if needed, but for now G is sufficient for scoring
    // private ctx: any;

    constructor(G: GameState, _ctx?: any) {
        this.G = G;
    }

    private getPips(num: number): number {
        const map: Record<number, number> = {
            2:1, 12:1,
            3:2, 11:2,
            4:3, 10:3,
            5:4, 9:4,
            6:5, 8:5
        };
        return map[num] || 0;
    }

    /**
     * Calculates scores for all valid settlement spots on the board.
     */
    public getAllSettlementScores(playerID: string): CoachRecommendation[] {
        const recommendations: CoachRecommendation[] = [];
        const hexes = this.G.board.hexes;
        const vertices = this.G.board.vertices;
        const player = this.G.players[playerID];

        // Calculate scarcity from G.boardStats (if available) or recalculate
        const totalPips = this.G.boardStats.totalPips;
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

        if (settlementCount >= 1) {
            // Collect resources from existing settlements
            player.settlements.forEach(sVId => {
                const s1HexIds = sVId.split('::');
                s1HexIds.forEach(hid => {
                    const h = hexes[hid];
                    if (h && h.terrain && TERRAIN_TO_RESOURCE[h.terrain]) {
                        existingResources.add(TERRAIN_TO_RESOURCE[h.terrain]);
                    }
                });
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
            const neighbors = getVertexNeighbors(vId);
            if (neighbors.some(n => vertices[n])) return;

            const thisV = vId.split('::');

            // Score the vertex
            let pips = 0;
            const resources: string[] = [];

            thisV.forEach(coordStr => {
                // Find the hex with these coords
                const hex = hexes[coordStr];

                if (hex && hex.terrain !== 'Desert' && hex.terrain !== 'Sea') {
                    const hexPips = this.getPips(hex.tokenValue || 0);
                    pips += hexPips;

                    // Map terrain to resource
                    const res = TERRAIN_TO_RESOURCE[hex.terrain];
                    if (res) resources.push(res);
                }
            });

            // Base Score = Pips
            let score = pips;
            const details = {
                pips: pips,
                scarcityBonus: false,
                scarceResources: [] as string[],
                diversityBonus: false,
                synergyBonus: false,
                neededResources: [] as string[]
            };

            const reasons: string[] = [`${pips} Pips`];
            const uniqueResources = new Set(resources);

            // 1. Scarcity Multiplier
            const scarceResources = [...uniqueResources].filter(r => scarcityMap[r]);
            if (scarceResources.length > 0) {
                score *= SCARCITY_MULTIPLIER;
                details.scarcityBonus = true;
                details.scarceResources = scarceResources;
                reasons.push('Scarcity Bonus');
            }

            // 2. Diversity Multiplier
            if (uniqueResources.size === 3 && resources.length === 3) {
                score *= DIVERSITY_MULTIPLIER;
                details.diversityBonus = true;
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
                    details.synergyBonus = true;
                    reasons.push('Synergy');
                }
            } else if (settlementCount >= 1) {
                // "One of Everything" Logic
                // For each resource this spot provides...
                const newResources: string[] = [];
                uniqueResources.forEach(r => {
                    if (!existingResources.has(r)) {
                        score += NEED_BONUS;
                        newResources.push(r);
                    }
                });

                if (newResources.length > 0) {
                    // Sort for deterministic output
                    details.neededResources = newResources.sort();
                    reasons.push(`Balances Economy (Added ${newResources.join(', ')})`);
                }
            }

            recommendations.push({
                vertexId: vId,
                score: Math.round(score * 10) / 10, // Round to 1 decimal
                reason: reasons.join(', '),
                details: details
            });
        });

        return recommendations;
    }

    public getBestSettlementSpots(playerID: string): CoachRecommendation[] {
        const allScores = this.getAllSettlementScores(playerID);
        // Sort by score desc and take top 3
        return allScores.sort((a, b) => b.score - a.score).slice(0, 3);
    }

    public recommendSettlementPlacement(playerID: string): BotMove | null {
        const best = this.getBestSettlementSpots(playerID);
        if (best.length > 0 && best[0].vertexId) {
            return { move: 'placeSettlement', args: [best[0].vertexId] };
        }
        return null;
    }

    public recommendRoadPlacement(playerID: string): BotMove | null {
        const player = this.G.players[playerID];
        // In Setup, usually place road attached to the last placed settlement
        if (player.settlements.length > 0) {
            const lastSettlement = player.settlements[player.settlements.length - 1];
            // Get edges connected to this vertex
            const edges = getEdgesForVertex(lastSettlement);
            // Return the first one that is not occupied
            for (const edgeId of edges) {
                if (!this.G.board.edges[edgeId]) {
                    return { move: 'placeRoad', args: [edgeId] };
                }
            }
        }
        return null; // Fallback or no valid move
    }

    public recommendNextMove(playerID: string): BotMove | null {
         const player = this.G.players[playerID];
         const resources = player.resources;

         // Priority 1: City (Ore: 3, Wheat: 2)
         if (resources.ore >= 3 && resources.wheat >= 2) {
             // Find a settlement to upgrade
             // Filter for actual settlements (not cities)
             const upgradable = player.settlements.filter(vId => {
                 const v = this.G.board.vertices[vId];
                 return v && v.type === 'settlement';
             });

             if (upgradable.length > 0) {
                 // Pick random settlement for now (or best pips)
                 const target = upgradable[0];
                 return { move: 'buildCity', args: [target] };
             }
         }

         // Priority 2: Settlement (Brick: 1, Wood: 1, Sheep: 1, Wheat: 1)
         if (resources.brick >= 1 && resources.wood >= 1 && resources.sheep >= 1 && resources.wheat >= 1) {
             // Find valid spot connected to roads
             // This is complex, requires graph traversal from roads.
             // For now, scan all roads, check adjacent vertices.
             for (const roadId of player.roads) {
                 const vertices = getVerticesForEdge(roadId);
                 for (const vId of vertices) {
                     if (!this.G.board.vertices[vId]) {
                         // Check distance rule
                         const neighbors = getVertexNeighbors(vId);
                         if (!neighbors.some(n => this.G.board.vertices[n])) {
                             return { move: 'buildSettlement', args: [vId] };
                         }
                     }
                 }
             }
         }

         // Priority 3: Road (Brick: 1, Wood: 1)
         if (resources.brick >= 1 && resources.wood >= 1) {
             // Find valid edge connected to roads or settlements
             // Scan settlements
             for (const sId of player.settlements) {
                 const edges = getEdgesForVertex(sId);
                 for (const eId of edges) {
                     if (!this.G.board.edges[eId]) {
                          return { move: 'buildRoad', args: [eId] };
                     }
                 }
             }
             // Scan roads
             for (const rId of player.roads) {
                 // Edges adjacent to road rId share a vertex.
                 const vertices = getVerticesForEdge(rId);
                 for (const vId of vertices) {
                      const edges = getEdgesForVertex(vId);
                      for (const eId of edges) {
                          if (eId !== rId && !this.G.board.edges[eId]) {
                              return { move: 'buildRoad', args: [eId] };
                          }
                      }
                 }
             }
         }

         // Else End Turn
         return { move: 'endTurn', args: [] };
    }
}

// --- Backward Compatibility Wrappers ---

export function getAllSettlementScores(G: GameState, playerID: string): CoachRecommendation[] {
    const coach = new Coach(G);
    return coach.getAllSettlementScores(playerID);
}

export function getBestSettlementSpots(G: GameState, playerID: string): CoachRecommendation[] {
    const coach = new Coach(G);
    return coach.getBestSettlementSpots(playerID);
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
