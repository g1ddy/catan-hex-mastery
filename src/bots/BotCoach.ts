import { GameState } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { getAffordableBuilds } from '../game/mechanics/costs';
import { getEdgesForVertex, getVerticesForHex } from '../game/hexUtils';
import { isValidSettlementPlacement, isValidCityPlacement, isValidRoadPlacement, isValidSettlementLocation } from '../game/rules/placement';

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

    /**
     * Enumerates all legally possible moves for the player in the current state.
     * This is intended for AI engines (MCTS, RandomBot) to know the full action space.
     */
    public getAvailableMoves(playerID: string): BotMove[] {
        const moves: BotMove[] = [];
        const player = this.G.players[playerID];
        const affordable = getAffordableBuilds(player.resources);

        // 1. Settlements
        if (affordable.settlement) {
             const candidates = this.getAllBoardVertices();
             candidates.forEach(vId => {
                 if (isValidSettlementPlacement(this.G, vId, playerID)) {
                     moves.push({ move: 'buildSettlement', args: [vId] });
                 }
             });
        }

        // 2. Cities
        if (affordable.city) {
            player.settlements.forEach(vId => {
                if (isValidCityPlacement(this.G, vId, playerID)) {
                    moves.push({ move: 'buildCity', args: [vId] });
                }
            });
        }

        // 3. Roads
        if (affordable.road) {
            const candidates = this.getAllBoardEdges();
            candidates.forEach(eId => {
                if (isValidRoadPlacement(this.G, eId, playerID)) {
                    moves.push({ move: 'buildRoad', args: [eId] });
                }
            });
        }

        // Always allow ending turn if nothing else (or even if something else)
        // Note: Logic for "can I end turn now?" depends on game phase.
        // Assuming this is called during ACTING stage.
        moves.push({ move: 'endTurn', args: [] });

        return moves;
    }

    private getAllBoardVertices(): Set<string> {
        const candidates = new Set<string>();
        Object.values(this.G.board.hexes).forEach(hex => {
            getVerticesForHex(hex.coords).forEach(v => candidates.add(v));
        });
        return candidates;
    }

    // Naive implementation: scan all vertices, get all edges.
    // Ideally, we'd have a list of all edges in G.board or static config.
    private getAllBoardEdges(): Set<string> {
        const candidates = new Set<string>();
         Object.values(this.G.board.hexes).forEach(hex => {
            getVerticesForHex(hex.coords).forEach(v => {
                getEdgesForVertex(v).forEach(e => candidates.add(e));
            });
        });
        return candidates;
    }

    public recommendSettlementPlacement(playerID: string): BotMove | null {
        // Setup Phase Logic (typically)
        const best = this.coach.getBestSettlementSpots(playerID);
        // Filter for validity in current context (e.g. if we are in setup, we check basic location validity)
        // If we are in game, we check connectivity.
        // Assuming this is mostly used for Setup or "Best Spot" analysis.

        // Let's iterate through best spots until we find one that is valid for *placement* (Setup rule: just empty & distance)
        for (const rec of best) {
             if (isValidSettlementLocation(this.G, rec.vertexId)) {
                 return { move: 'placeSettlement', args: [rec.vertexId] };
             }
        }
        return null;
    }

    public recommendRoadPlacement(playerID: string): BotMove | null {
        const player = this.G.players[playerID];
        // In Setup, usually place road attached to the last placed settlement
        if (player.settlements.length > 0) {
            const lastSettlement = player.settlements[player.settlements.length - 1];
            const edges = getEdgesForVertex(lastSettlement);

            for (const edgeId of edges) {
                // Use strict rule: must be empty (Setup)
                if (!this.G.board.edges[edgeId]) {
                    return { move: 'placeRoad', args: [edgeId] };
                }
            }
        }
        return null;
    }

    public recommendNextMove(playerID: string): BotMove | null {
         const moves = this.getAvailableMoves(playerID);

         // Priority 1: City
         const cityMove = moves.find(m => m.move === 'buildCity');
         if (cityMove) return cityMove;

         // Priority 2: Settlement
         const settlementMove = moves.find(m => m.move === 'buildSettlement');
         if (settlementMove) return settlementMove;

         // Priority 3: Road
         const roadMove = moves.find(m => m.move === 'buildRoad');
         if (roadMove) return roadMove;

         return { move: 'endTurn', args: [] };
    }
}
