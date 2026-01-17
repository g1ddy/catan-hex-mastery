import { Ctx } from 'boardgame.io';
import { GameState, GameAction } from '../game/types';
import { Coach, CoachRecommendation } from '../game/analysis/coach';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';
import { isValidPlayer } from '../utils/validation';
import { getAffordableBuilds } from '../game/mechanics/costs';
import { calculateTrade } from '../game/mechanics/trade';

// Re-export BotMove to match boardgame.io's ActionShape if needed,
// but local definition is fine as long as we cast it when interacting with framework types.
import { BotMove } from '../game/types'; // Kept for backward compatibility if other modules import it from here
export type { BotMove };

const STRATEGIC_ADVICE_BOOST = 1.5;
const TOP_TIER_WEIGHT_THRESHOLD = 0.9;
const AFFORDABLE_BOOST = 10.0;
const ROAD_FATIGUE_PENALTY = 0.01;
const TRADE_BOOST = 5.0;
const ROAD_FATIGUE_SETTLEMENT_MULTIPLIER = 2;
const ROAD_FATIGUE_BASE_ALLOWANCE = 2;
const ORE_RESERVE_THRESHOLD = 6;

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
     * Helper to refine a list of top moves of a specific type using spatial scoring.
     * Finds the single best move of that type and promotes it to the top.
     */
    private refineTopMoves(
        topMoves: GameAction[],
        sortedMoves: GameAction[],
        moveType: string,
        scoreFn: (candidates: string[]) => CoachRecommendation[]
    ): GameAction[] | null {
        const specificMoves = topMoves.filter(m => this.getMoveName(m) === moveType);

        if (specificMoves.length <= 1) {
            return null; // No refinement needed or impossible
        }

        // Extract candidate IDs (e.g. vertex IDs)
        const candidateIds = specificMoves.map(m => this.getMoveArgs(m)[0]);

        // Get scores from Coach
        const recommendations = scoreFn(candidateIds);
        const recommendationMap = new Map(recommendations.map(r => [r.vertexId, r.score]));

        // Find the single best move
        const bestMove = specificMoves.reduce((best, current) => {
            const vBest = this.getMoveArgs(best)[0];
            const vCurrent = this.getMoveArgs(current)[0];
            const sBest = recommendationMap.get(vBest) ?? 0;
            const sCurrent = recommendationMap.get(vCurrent) ?? 0;
            return sCurrent > sBest ? current : best;
        });

        // Promote best move to front
        const others = sortedMoves.filter(m => m !== bestMove);
        return [bestMove, ...others];
    }

    /**
     * Filters and sorts a list of available moves to find the "optimal" ones.
     * @param allMoves The full list of legal moves (e.g. from ai.enumerate)
     * @param playerID The player ID
     * @param ctx The boardgame.io context object
     * @returns A sorted list of optimal moves (best first)
     */
    public filterOptimalMoves(allMoves: GameAction[], playerID: string, ctx: Ctx): GameAction[] {
        if (typeof playerID !== 'string' || playerID.includes('__proto__') || playerID.includes('constructor')) {
            return [];
        }

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

        // Pre-calculate state for Dynamic Weights
        // eslint-disable-next-line security/detect-object-injection
        const player = this.G.players[playerID];
        const affordable = getAffordableBuilds(player.resources);
        const settlementCount = player.settlements.length;
        // const cityCount = player.cities.length; // Not used in fatigue formula currently
        const roadCount = player.roads.length;

        const roadFatigue = roadCount > (settlementCount * ROAD_FATIGUE_SETTLEMENT_MULTIPLIER + ROAD_FATIGUE_BASE_ALLOWANCE);

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
                case 'tradeBank': weight = this.profile.weights.tradeBank; break;
                default: weight = 0.5; break;
            }

            // Coach Strategic Multiplier
            if (advisedMoves.has(name)) {
                weight *= STRATEGIC_ADVICE_BOOST; // Boost advised moves
            }

            // Dynamic Logic Multipliers
            if (name === 'buildSettlement' && affordable.settlement) {
                weight *= AFFORDABLE_BOOST;
            }
            if (name === 'buildCity' && affordable.city) {
                weight *= AFFORDABLE_BOOST;
            }
            if (name === 'buildRoad') {
                if (roadFatigue) {
                    weight *= ROAD_FATIGUE_PENALTY;
                }
                // Minor boost if we can afford a road but NOT a settlement, to keep expanding?
                // Or just rely on base weight. User asked to "balance" it.
                // If not affordable, getAffordableBuilds returns false, but 'buildRoad' won't be in list anyway
                // because enumerator checks affordability.
            }
            if (name === 'tradeBank') {
                // If we can't afford a settlement, but can trade, boost trade.
                if (!affordable.settlement) {
                     weight *= TRADE_BOOST;
                }

                // Smart Ban: Protect Ore (City bottleneck)
                // If we are giving away Ore and have <= ORE_RESERVE_THRESHOLD, we shouldn't trade it away.
                // We need 3 Ore for a City. Trading 4 leaves us with too few.
                // Only trade Ore if we have a massive surplus.
                const tradeResult = calculateTrade(player.resources);
                if (tradeResult.give === 'ore' && player.resources.ore <= ORE_RESERVE_THRESHOLD) {
                    weight = 0;
                }
            }

            return weight;
        };

        // Capture weights to handle tie-breaking/shuffling later
        const moveWeights = new Map<GameAction, number>();
        allMoves.forEach(m => moveWeights.set(m, getWeightedScore(m)));

        // Initial Sort by Weight
        const sortedMoves = [...allMoves].sort((a, b) => (moveWeights.get(b)! - moveWeights.get(a)!));

        if (sortedMoves.length === 0) return [];

        // 4. Refine Top Candidates (Spatial Logic)
        const topWeight = moveWeights.get(sortedMoves[0])!;
        // Consider moves within threshold of top weight as "Top Tier"
        const topMoves = sortedMoves.filter(m => moveWeights.get(m)! >= topWeight * TOP_TIER_WEIGHT_THRESHOLD);

        // Refine Settlements (pick best spot)
        const refinedSettlements = this.refineTopMoves(
            topMoves,
            sortedMoves,
            'buildSettlement',
            (_candidates) => this.coach.getAllSettlementScores(playerID, ctx)
        );
        if (refinedSettlements) return refinedSettlements;

        // Refine Cities (pick best spot)
        const refinedCities = this.refineTopMoves(
            topMoves,
            sortedMoves,
            'buildCity',
            (candidates) => this.coach.getBestCitySpots(playerID, ctx, candidates)
        );
        if (refinedCities) return refinedCities;

        // Shuffle ties for Top Tier moves if no specific refinement (e.g. Roads)
        // Only shuffle if ALL top moves are roads to avoid mixing types incorrectly.
        const topMoveNames = topMoves.map(m => this.getMoveName(m));
        const allAreRoads = topMoveNames.every(name => name === 'buildRoad' || name === 'placeRoad');

        if (allAreRoads) {
            // Shuffle topMoves in place to randomize road choice
            for (let i = topMoves.length - 1; i > 0; i--) {
                 const j = Math.floor(Math.random() * (i + 1));
                 [topMoves[i], topMoves[j]] = [topMoves[j], topMoves[i]];
             }
             // Reconstruct sorted list: Top Shuffled + Rest
             const rest = sortedMoves.filter(m => !topMoves.includes(m));
             return [...topMoves, ...rest];
        }

        return sortedMoves;
    }
}
