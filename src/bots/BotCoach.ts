import { GameState } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { getAffordableBuilds } from '../game/mechanics/costs';
import { getValidSettlementSpots, getValidCitySpots, getValidRoadSpots, getValidSetupRoadSpots } from '../game/rules/validator';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';

export interface BotMove {
    move: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line security/detect-object-injection
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

        // The Coach uses getValidSetupSettlementSpots internally, so validity is guaranteed.
        // We simply pick the top recommendation.
        if (best.length > 0) {
            return { move: 'placeSettlement', args: [best[0].vertexId] };
        }
        return null;
    }

    public recommendRoadPlacement(playerID: string): BotMove | null {
        const validRoads = getValidSetupRoadSpots(this.G, playerID);
        // During setup, any valid road attached to the last settlement is acceptable.
        // There is rarely a strategic difference unless one direction is blocked (which the validator checks)
        // or leads to better future expansion (which is too advanced for this scope).
        if (validRoads.size > 0) {
            const firstValid = validRoads.values().next().value;
            return { move: 'placeRoad', args: [firstValid] };
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
