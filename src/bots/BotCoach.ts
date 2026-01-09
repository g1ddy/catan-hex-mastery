import { GameState } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { getAffordableBuilds } from '../game/mechanics/costs';
import { getEdgesForVertex } from '../game/hexUtils';
import { isValidSettlementLocation } from '../game/rules/placement';
import { getValidSettlementSpots, getValidCitySpots, getValidRoadSpots } from '../game/rules/validator';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';

export interface BotMove {
    move: string;
    args: any[];
}

export class BotCoach {
    private G: GameState;
    private coach: Coach;
    private profile: BotProfile;

    constructor(G: GameState, coach: Coach, profile: BotProfile = BALANCED_PROFILE) {
        this.G = G;
        this.coach = coach;
        this.profile = profile;
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
             const validSpots = getValidSettlementSpots(this.G, playerID);
             validSpots.forEach(vId => {
                 moves.push({ move: 'buildSettlement', args: [vId] });
             });
        }

        // 2. Cities
        if (affordable.city) {
            const validSpots = getValidCitySpots(this.G, playerID);
            validSpots.forEach(vId => {
                moves.push({ move: 'buildCity', args: [vId] });
            });
        }

        // 3. Roads
        if (affordable.road) {
            const validSpots = getValidRoadSpots(this.G, playerID);
            validSpots.forEach(eId => {
                moves.push({ move: 'buildRoad', args: [eId] });
            });
        }

        // Always allow ending turn if nothing else (or even if something else)
        // Note: Logic for "can I end turn now?" depends on game phase.
        // Assuming this is called during ACTING stage.
        moves.push({ move: 'endTurn', args: [] });

        return moves;
    }

    public recommendSettlementPlacement(playerID: string): BotMove | null {
        // Setup Phase Logic (typically)
        const best = this.coach.getBestSettlementSpots(playerID);

        // Iterate through best spots until we find one that is valid for *placement* (Setup rule)
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

         // Helper to score moves based on profile weights
         const getMoveWeight = (move: BotMove): number => {
            switch (move.move) {
                case 'buildCity': return this.profile.weights.buildCity;
                case 'buildSettlement': return this.profile.weights.buildSettlement;
                case 'buildRoad': return this.profile.weights.buildRoad;
                case 'endTurn': return 1; // Base weight for ending turn (usually lowest unless blocked)
                default: return 0;
            }
         };

         // Sort moves by weight
         moves.sort((a, b) => getMoveWeight(b) - getMoveWeight(a));

         if (moves.length > 0) {
            // Simple logic: pick the highest weighted move.
            // If the top move is endTurn, but we have other actions, we might still want to do them
            // if we have resources. But getAvailableMoves checks resources.
            // If buildCity and buildSettlement have same weight, stable sort or first one wins.

            // To make it smarter, we would look at specific locations (e.g. which road is best?),
            // but for now, we just pick the action type preferred by the profile.
            return moves[0];
         }

         return { move: 'endTurn', args: [] };
    }
}
