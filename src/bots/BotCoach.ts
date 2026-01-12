import { GameState, GameAction } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';

// Re-export BotMove to match boardgame.io's ActionShape if needed,
// but local definition is fine as long as we cast it when interacting with framework types.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BotMove } from '../game/types'; // Kept for backward compatibility if other modules import it from here
export type { BotMove };

export class BotCoach {
    private G: GameState;
    private coach: Coach;
    private profile: BotProfile;

    constructor(G: GameState, coach: Coach, profile: BotProfile = BALANCED_PROFILE) {
        this.G = G;
        this.coach = coach;
        this.profile = profile;
    }

    private isValidPlayerID(playerID: string): boolean {
        // Validate playerID using strict object check to prevent prototype pollution or inherited property access
        return Object.prototype.hasOwnProperty.call(this.G.players, playerID);
    }

    private getMoveName(action: GameAction): string {
        if ('payload' in action) {
            return action.payload.type;
        }
        return action.move;
    }

    private getMoveArgs(action: GameAction): any[] {
        if ('payload' in action) {
            return action.payload.args;
        }
        return action.args || [];
    }

    /**
     * Filters and sorts a list of available moves to find the "optimal" ones.
     * @param allMoves The full list of legal moves (e.g. from ai.enumerate)
     * @param playerID The player ID
     * @returns A sorted list of optimal moves (best first)
     */
    public filterOptimalMoves(allMoves: GameAction[], playerID: string): GameAction[] {
        if (!this.isValidPlayerID(playerID)) {
            console.warn('Invalid playerID:', playerID);
            return [];
        }

        if (!allMoves || allMoves.length === 0) return [];

        // Detect current stage based on move types
        const isSetupSettlement = allMoves.some(m => this.getMoveName(m) === 'placeSettlement');
        // const isSetupRoad = allMoves.some(m => this.getMoveName(m) === 'placeRoad'); // Unused for now
        const isRolling = allMoves.some(m => this.getMoveName(m) === 'rollDice');

        if (isRolling) {
            // Only one option usually
            return allMoves;
        }

        if (isSetupSettlement) {
            // Use Coach analysis to find the best spots
            const bestSpots = this.coach.getBestSettlementSpots(playerID);

            // Optimization: Map moves by vertexId for O(1) lookup
            const movesByVertex = new Map<string, GameAction>();
            allMoves.forEach(m => {
                if (this.getMoveName(m) === 'placeSettlement') {
                    const args = this.getMoveArgs(m);
                    if (args[0]) {
                        movesByVertex.set(args[0], m);
                    }
                }
            });

            // Map the best spots to the available moves
            // bestSpots is ordered best to worst
            const rankedMoves: GameAction[] = [];

            bestSpots.forEach(spot => {
                const move = movesByVertex.get(spot.vertexId);
                if (move) {
                    rankedMoves.push(move);
                }
            });

            // If we found matches, return them.
            // If for some reason analysis fails but moves exist, fallback to random (return all)
            return rankedMoves.length > 0 ? rankedMoves : allMoves;
        }

        // For setup roads and normal gameplay, use profile weights
        // ACTING PHASE + SETUP ROAD
        const getMoveWeight = (move: GameAction): number => {
            const name = this.getMoveName(move);
            switch (name) {
                case 'buildCity': return this.profile.weights.buildCity;
                case 'buildSettlement': return this.profile.weights.buildSettlement;
                case 'buildRoad': return this.profile.weights.buildRoad;
                case 'placeRoad': return this.profile.weights.buildRoad; // Reuse road weight for setup
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
}
