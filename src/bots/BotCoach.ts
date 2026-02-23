import { Ctx } from 'boardgame.io';
import { GameState, GameAction, BotMove } from '../game/core/types';
import { Coach } from '../game/analysis/coach';
import { CoachRecommendation } from '../game/analysis/types';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';
import { isValidPlayer } from '../game/core/validation';
import { getAffordableBuilds } from '../game/mechanics/costs';
import { MoveScorer, ScoringContext } from './logic/MoveScorer';
import { ActionUtils } from './utils/ActionUtils';

export type { BotMove };

const TOP_TIER_WEIGHT_THRESHOLD = 0.9;
const ROAD_FATIGUE_SETTLEMENT_MULTIPLIER = 2;
const ROAD_FATIGUE_BASE_ALLOWANCE = 2;

// Road Strategy Constants
const MIN_ROAD_DECAY_FACTOR = 0.7;
const ROAD_DECAY_AGGRESSIVENESS_SCALE = 0.25;

export class BotCoach {
    // Bot logic using Coach recommendations
    private G: GameState;
    private coach: Coach;
    private profile: BotProfile;
    private scorer: MoveScorer;

    constructor(G: GameState, coach: Coach, profile: BotProfile = BALANCED_PROFILE) {
        this.G = G;
        this.coach = coach;
        this.profile = profile;
        this.scorer = new MoveScorer();
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
        const specificMoves = topMoves.filter(m => ActionUtils.getMoveName(m) === moveType);

        if (specificMoves.length <= 1) {
            return null; // No refinement needed or impossible
        }

        // Extract candidate IDs (e.g. vertex IDs)
        // We filter out undefined values to ensure type safety, assuming spatial moves always have 1 arg (the ID)
        const candidateIds = specificMoves
            .map(m => ActionUtils.getMoveArgs(m)[0])
            .filter((id): id is string => typeof id === 'string');

        // Get scores from Coach
        let recommendations = scoreFn(candidateIds);

        // Special handling for Roads: Apply Strategy (Distance Decay) here
        // This decouples the "Bot Personality" from the "Coach Analysis"
        if (moveType === 'buildRoad' || moveType === 'placeRoad') {
            const decayFactor = MIN_ROAD_DECAY_FACTOR + (this.profile.expansion.aggressiveness * ROAD_DECAY_AGGRESSIVENESS_SCALE);
            recommendations = recommendations.map(rec => {
                const dist = rec.details.distance || 1;
                const raw = rec.details.rawScore || rec.score;
                // Apply decay: Score = Raw * (Factor ^ (Distance - 1))
                // Dist 1 = Factor^0 = 1. No decay.
                // Dist 2 = Factor^1.
                const decayedScore = raw * Math.pow(decayFactor, dist - 1);
                return {
                    ...rec,
                    score: decayedScore
                };
            }).sort((a, b) => b.score - a.score);
        }

        // Map recommendations to scores.
        // For road moves, recommendations may contain multiple entries per edge (targets at different distances).
        // Since `recommendations` is sorted High-to-Low by score, we must ensure we keep the HIGHEST score for each edge.
        // A simple Map(iterable) constructor overwrites if keys duplicate.
        // So we want to process in reverse (Low-to-High) so High overwrites Low,
        // OR manually loop and `set` only if `!has`.
        const recommendationMap = new Map<string, number>();
        for (const r of recommendations) {
            const id = r.edgeId || r.vertexId || '';
            // Since recommendations are sorted descending, the first time we see an ID, it's the best score.
            if (!recommendationMap.has(id)) {
                recommendationMap.set(id, r.score);
            }
        }

        // Shuffle candidates if profile requests randomization to break ties
        if (this.profile.randomize) {
            for (let i = specificMoves.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // eslint-disable-next-line security/detect-object-injection
                [specificMoves[i], specificMoves[j]] = [specificMoves[j], specificMoves[i]];
            }
        }

        // Find the single best move
        const bestMove = specificMoves.reduce((best, current) => {
            const vBest = ActionUtils.getMoveArgs(best)[0];
            const vCurrent = ActionUtils.getMoveArgs(current)[0];

            // Safety check for indices
            if (typeof vBest !== 'string' || typeof vCurrent !== 'string') return best;

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

        if (!isValidPlayer(playerID, this.G)) {
            console.warn('Invalid playerID:', playerID);
            return [];
        }

        if (!allMoves || allMoves.length === 0) return [];

        // 1. Detect Roll Dice (always prioritize)
        const isRolling = allMoves.some(m => ActionUtils.getMoveName(m) === 'rollDice');
        if (isRolling) {
            return allMoves;
        }

        // 2. Setup Phase Optimization (Special logic preserved)
        // Setup Settlement needs heavy Coach lifting, better done specifically here
        // to avoid recalculating the map 50 times in scoreAction loop.
        const isSetupSettlement = allMoves.some(m => ActionUtils.getMoveName(m) === 'placeSettlement');
        if (isSetupSettlement) {
            // Use Coach analysis to find the best spots
            const bestSpots = this.coach.getBestSettlementSpots(playerID, ctx);
            const movesByVertex = new Map<string, GameAction>();
            allMoves.forEach(m => {
                if (ActionUtils.getMoveName(m) === 'placeSettlement') {
                    const args = ActionUtils.getMoveArgs(m);
                    // Safely access first argument (vertexID)
                    const vId = args[0];
                    if (typeof vId === 'string') {
                        movesByVertex.set(vId, m);
                    }
                }
            });
            const rankedMoves: GameAction[] = [];
            bestSpots.forEach(spot => {
                // vertexId is mandatory for settlement spots, but safety check anyway
                if (spot.vertexId) {
                    const move = movesByVertex.get(spot.vertexId);
                    if (move) rankedMoves.push(move);
                }
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
        const roadCount = player.roads.length;

        const isRoadFatigued = roadCount > (settlementCount * ROAD_FATIGUE_SETTLEMENT_MULTIPLIER + ROAD_FATIGUE_BASE_ALLOWANCE);

        const context: ScoringContext = {
            profile: this.profile,
            advisedMoves,
            affordable,
            isRoadFatigued,
            coach: this.coach,
            playerID,
            ctx
        };

        // Capture weights to handle tie-breaking/shuffling later
        const moveWeights = new Map<GameAction, number>();
        allMoves.forEach(m => moveWeights.set(m, this.scorer.getWeightedScore(m, context)));

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

        // Refine Roads (pick best spot)
        const refinedRoads = this.refineTopMoves(
            topMoves,
            sortedMoves,
            'buildRoad',
            (_candidates) => this.coach.getBestRoadSpots(playerID, ctx)
        );
        if (refinedRoads) return refinedRoads;

        const refinedSetupRoads = this.refineTopMoves(
            topMoves,
            sortedMoves,
            'placeRoad',
            (_candidates) => this.coach.getBestRoadSpots(playerID, ctx)
        );
        if (refinedSetupRoads) return refinedSetupRoads;

        // Shuffle ties for Top Tier moves if no specific refinement (e.g. Roads)
        // Only shuffle if ALL top moves are roads to avoid mixing types incorrectly.
        const topMoveNames = topMoves.map(m => ActionUtils.getMoveName(m));
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
