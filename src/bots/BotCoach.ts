import { GameState } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { getAffordableBuilds } from '../game/mechanics/costs';
import { getValidSettlementSpots, getValidCitySpots, getValidRoadSpots, getValidSetupRoadSpots } from '../game/rules/validator';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';

// Re-export BotMove to match boardgame.io's ActionShape if needed,
// but local definition is fine as long as we cast it when interacting with framework types.
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
     *
     * @deprecated Use src/game/ai.ts enumerate() instead.
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

    /**
     * Filters and sorts a list of available moves to find the "optimal" ones.
     * @param allMoves The full list of legal moves (e.g. from ai.enumerate)
     * @param playerID The player ID
     * @returns A sorted list of optimal moves (best first)
     */
    public filterOptimalMoves(allMoves: BotMove[], playerID: string): BotMove[] {
        if (!allMoves || allMoves.length === 0) return [];

        // Detect current stage based on move types
        const isSetupSettlement = allMoves.some(m => m.move === 'placeSettlement');
        const isSetupRoad = allMoves.some(m => m.move === 'placeRoad');
        const isRolling = allMoves.some(m => m.move === 'rollDice');

        if (isRolling) {
            // Only one option usually
            return allMoves;
        }

        if (isSetupSettlement) {
            // Use Coach analysis to find the best spots
            const bestSpots = this.coach.getBestSettlementSpots(playerID);

            // Map the best spots to the available moves
            // bestSpots is ordered best to worst
            const rankedMoves: BotMove[] = [];

            bestSpots.forEach(spot => {
                const matchingMove = allMoves.find(m => m.move === 'placeSettlement' && m.args[0] === spot.vertexId);
                if (matchingMove) {
                    rankedMoves.push(matchingMove);
                }
            });

            // If we found matches, return them.
            // If for some reason analysis fails but moves exist, fallback to random (return all)
            return rankedMoves.length > 0 ? rankedMoves : allMoves;
        }

        if (isSetupRoad) {
            // For now, return all valid road placements as they are mostly equivalent in simple setup
            // TODO: Add heuristics for road direction
            return allMoves;
        }

        // ACTING PHASE
        // Use profile weights to rank moves
        const getMoveWeight = (move: BotMove): number => {
            switch (move.move) {
                case 'buildCity': return this.profile.weights.buildCity;
                case 'buildSettlement': return this.profile.weights.buildSettlement;
                case 'buildRoad': return this.profile.weights.buildRoad;
                case 'buyDevCard': return this.profile.weights.buyDevCard;
                case 'endTurn': return 1; // Base weight
                default: return 0;
            }
        };

        // Sort moves by weight
        const sortedMoves = [...allMoves].sort((a, b) => getMoveWeight(b) - getMoveWeight(a));

        // Filter to keep only the best moves (sharing the highest weight)
        if (sortedMoves.length > 0) {
            const maxWeight = getMoveWeight(sortedMoves[0]);
            return sortedMoves.filter(m => getMoveWeight(m) === maxWeight);
        }

        return sortedMoves;
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
         const ranked = this.filterOptimalMoves(moves, playerID);
         return ranked.length > 0 ? ranked[0] : null;
    }
}
