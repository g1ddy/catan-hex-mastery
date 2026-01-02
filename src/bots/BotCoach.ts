import { GameState } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { getEdgesForVertex, getVerticesForEdge, getVertexNeighbors } from '../game/hexUtils';

export interface BotMove {
    move: string;
    args: any[];
}

export class BotCoach {
    private G: GameState;
    private coach: Coach;

    constructor(G: GameState, coach: Coach) {
        this.G = G;
        this.coach = coach;
    }

    public recommendSettlementPlacement(playerID: string): BotMove | null {
        const best = this.coach.getBestSettlementSpots(playerID);
        if (best.length > 0) {
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
