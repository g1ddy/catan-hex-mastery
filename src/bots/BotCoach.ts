import { Ctx } from 'boardgame.io';
import { GameState, GameAction } from '../game/types';
import { Coach } from '../game/analysis/coach';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';
import { isValidPlayer } from '../utils/validation';

// Re-export BotMove to match boardgame.io's ActionShape if needed,
// but local definition is fine as long as we cast it when interacting with framework types.
import { BotMove } from '../game/types'; // Kept for backward compatibility if other modules import it from here
export type { BotMove };

const STRATEGIC_ADVICE_BOOST = 1.5;
const TOP_TIER_WEIGHT_THRESHOLD = 0.9;

export class BotCoach {
    private G: GameState;
    private coach: Coach;
    private profile: BotProfile;

    constructor(G: GameState, coach: Coach, profile: BotProfile = BALANCED_PROFILE) {
        this.G = G;
        this.coach = coach;
        this.profile = profile;
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

        if (!isValidPlayer(this.G, playerID)) {
            console.warn('Invalid playerID:', playerID);
            return [];
        }

        if (!allMoves || allMoves.length === 0) return [];

        // 1. Detect Roll Dice (always prioritize)
        const isRolling = allMoves.some(m => this.getMoveName(m) === 'rollDice');
        if (isRolling) {
            return allMoves;
        }

        // 2. Setup Phase Optimization (Special logic preserved)
        // Setup Settlement needs heavy Coach lifting, better done specifically here
        // to avoid recalculating the map 50 times in scoreAction loop.
        const isSetupSettlement = allMoves.some(m => this.getMoveName(m) === 'placeSettlement');
        if (isSetupSettlement) {
            // Use Coach analysis to find the best spots
            const bestSpots = this.coach.getBestSettlementSpots(playerID, ctx);
            const movesByVertex = new Map<string, GameAction>();
            allMoves.forEach(m => {
                if (this.getMoveName(m) === 'placeSettlement') {
                    const args = this.getMoveArgs(m);
                    if (args[0]) movesByVertex.set(args[0], m);
                }
            });
            const rankedMoves: GameAction[] = [];
            bestSpots.forEach(spot => {
                const move = movesByVertex.get(spot.vertexId);
                if (move) rankedMoves.push(move);
            });
            return rankedMoves.length > 0 ? rankedMoves : allMoves;
        }

        // 3. General Gameplay Evaluation
        // Combine Profile Weights + Coach Strategic Advice

        // Get generic advice once
        const strategicAdvice = this.coach.getStrategicAdvice(playerID, ctx);
        const advisedMoves = new Set(strategicAdvice.recommendedMoves);

        const getWeightedScore = (move: GameAction): number => {
            const name = this.getMoveName(move);
            let weight = 0;

            // Base Weight from Profile
            switch (name) {
                case 'buildCity': weight = this.profile.weights.buildCity; break;
                case 'buildSettlement': weight = this.profile.weights.buildSettlement; break;
                case 'buildRoad': weight = this.profile.weights.buildRoad; break;
                case 'placeRoad': weight = this.profile.weights.buildRoad; break;
                case 'buyDevCard': weight = this.profile.weights.buyDevCard; break;
                case 'endTurn': weight = 1.0; break;
                default: weight = 0.5; break;
            }

            // Coach Strategic Multiplier
            if (advisedMoves.has(name)) {
                weight *= STRATEGIC_ADVICE_BOOST; // Boost advised moves
            }

            return weight;
        };

        // Initial Sort by Weight
        const sortedMoves = [...allMoves].sort((a, b) => getWeightedScore(b) - getWeightedScore(a));

        if (sortedMoves.length === 0) return [];

        // 4. Refine Top Candidates (Spatial Logic)
        // If top moves are settlements/cities, use detailed scoring to pick the best spot.
        const topWeight = getWeightedScore(sortedMoves[0]);
        // Consider moves within threshold of top weight as "Top Tier"
        const topMoves = sortedMoves.filter(m => getWeightedScore(m) >= topWeight * TOP_TIER_WEIGHT_THRESHOLD);

        // Check if we need to refine Settlements
        const settlementMoves = topMoves.filter(m => this.getMoveName(m) === 'buildSettlement');
        if (settlementMoves.length > 1) {
             const recommendations = this.coach.getAllSettlementScores(playerID, ctx);
             const recommendationMap = new Map(recommendations.map(r => [r.vertexId, r.score]));

             // Find the single best settlement move from the top candidates
             const bestSettlementMove = settlementMoves.reduce((best, current) => {
                 const vBest = this.getMoveArgs(best)[0];
                 const vCurrent = this.getMoveArgs(current)[0];
                 const sBest = recommendationMap.get(vBest) ?? 0;
                 const sCurrent = recommendationMap.get(vCurrent) ?? 0;
                 return sCurrent > sBest ? current : best;
             });

             // Promote the best settlement to the front of the full sorted list
             // This keeps other lower-scored settlements in the list but prioritized lower
             const others = sortedMoves.filter(m => m !== bestSettlementMove);
             return [bestSettlementMove, ...others];
        }

        // Check if we need to refine Cities
        const cityMoves = topMoves.filter(m => this.getMoveName(m) === 'buildCity');
        if (cityMoves.length > 1) {
             const candidates = cityMoves.map(m => this.getMoveArgs(m)[0]);
             const bestSpots = this.coach.getBestCitySpots(playerID, ctx, candidates);
             const bestVId = bestSpots[0]?.vertexId;

             if (bestVId) {
                 const bestMove = cityMoves.find(m => this.getMoveArgs(m)[0] === bestVId);
                 if (bestMove) {
                     const others = sortedMoves.filter(m => m !== bestMove);
                     return [bestMove, ...others];
                 }
             }
        }

        return sortedMoves;
    }
}
