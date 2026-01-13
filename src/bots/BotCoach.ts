import { Ctx } from 'boardgame.io';
import { GameState, GameAction } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';

// Re-export BotMove to match boardgame.io's ActionShape if needed,
// but local definition is fine as long as we cast it when interacting with framework types.
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
        return (action as BotMove).move;
    }

    private getMoveArgs(action: GameAction): any[] {
        if ('payload' in action) {
            return action.payload.args;
        }
        return (action as BotMove).args || [];
    }

    /**
     * Filters and sorts a list of available moves to find the "optimal" ones.
     * @param allMoves The full list of legal moves (e.g. from ai.enumerate)
     * @param playerID The player ID
     * @param ctx The boardgame.io context object
     * @returns A sorted list of optimal moves (best first)
     */
    public filterOptimalMoves(allMoves: GameAction[], playerID: string, ctx: Ctx): GameAction[] {
        if (playerID !== ctx.currentPlayer) {
            console.warn(`Attempted to get moves for player ${playerID} but current player is ${ctx.currentPlayer}`);
            return [];
        }

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
            const bestSpots = this.coach.getBestSettlementSpots(playerID, ctx);

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

        if (sortedMoves.length === 0) {
            return [];
        }

        const maxWeight = getMoveWeight(sortedMoves[0]);
        const topMoves = sortedMoves.filter(m => getMoveWeight(m) === maxWeight);

        // If the best move is to build a city, and there's more than one option,
        // use Coach analysis to find the best one.
        if (this.getMoveName(topMoves[0]) === 'buildCity' && topMoves.length > 1) {
            const cityCandidates: string[] = [];
            const movesByVertex = new Map<string, GameAction>();

            topMoves.forEach(m => {
                const args = this.getMoveArgs(m);
                const vId = args[0];
                if (vId && typeof vId === 'string') {
                    cityCandidates.push(vId);
                    movesByVertex.set(vId, m);
                }
            });

            if (cityCandidates.length > 0) {
                const bestCitySpots = this.coach.getBestCitySpots(playerID, ctx, cityCandidates);
                const bestMove = movesByVertex.get(bestCitySpots[0]?.vertexId);
                if (bestMove) {
                    return [bestMove];
                }
            }
            // Fallback: return first
            return [topMoves[0]];
        }

        // If building a settlement is a top-weighted move and there are multiple settlement options,
        // use the Coach to find the best one.
        const settlementMoves = topMoves.filter(m => this.getMoveName(m) === 'buildSettlement');

        if (settlementMoves.length > 1) {
            const recommendations = this.coach.getAllSettlementScores(playerID, ctx);
            const recommendationMap = new Map(recommendations.map(r => [r.vertexId, r.score]));

            const scoredSettlements = settlementMoves
                .map(move => {
                    const vId = this.getMoveArgs(move)[0];
                    if (!vId || typeof vId !== 'string') {
                        return { move, score: -1 }; // Malformed move
                    }
                    const score = recommendationMap.get(vId) ?? 0;
                    return { move, score };
                })
                .sort((a, b) => b.score - a.score);

            const bestSettlement = scoredSettlements[0].move;
            const otherTopMoves = topMoves.filter(m => this.getMoveName(m) !== 'buildSettlement');

            // Return the best settlement along with other equally-weighted top moves
            return [bestSettlement, ...otherTopMoves];
        }


        return topMoves;
    }
}
