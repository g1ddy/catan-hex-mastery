import { GameContext, GameState, GameAction, BotMove } from '../game/core/types';
import { Coach } from '../game/analysis/coach';
import { BotProfile, BALANCED_PROFILE } from './profiles/BotProfile';
import { MoveScorer } from './logic/MoveScorer';
import { OptimalMoveFilter } from './logic/OptimalMoveFilter';

import { CatanSearchGame } from '../game/ai/catan/CatanSearchGame';
import type { CatanSearchState } from '../game/ai/catan/CatanSearchState';
import type { CatanSearchAction } from '../game/ai/catan/CatanSearchAction';
import { CatanEvaluator, CatanEvaluatorWeights } from '../game/ai/catan/CatanEvaluator';
import { CATAN_MCTS_EVALUATOR_WEIGHTS } from './CatanMCTSBot';
import { CatanRolloutPolicy } from '../game/ai/catan/CatanRolloutPolicy';
import { MctsEngine } from '../game/ai/search/MctsEngine';
import { UctSelectionPolicy } from '../game/ai/search/UctSelectionPolicy';
import type { SearchResult } from '../game/ai/search/SearchResult';

export type { BotMove };

export interface BotCoachConfig {
    seed?: string | number;
    iterations?: number;
    playoutDepth?: number;
    maxDepth?: number;
    explorationConstant?: number;
    evaluatorWeights?: Partial<CatanEvaluatorWeights>;
}

export interface BotCoachRecommendation {
    selectedAction: CatanSearchAction | null;
    explanation: string;
    result: SearchResult<CatanSearchAction>;
}

export class BotCoach {
    private readonly G: GameState;
    public readonly coach: Coach;
    public readonly profile: BotProfile;
    private readonly filter: OptimalMoveFilter;
    private readonly config: BotCoachConfig;

    private readonly searchGame: CatanSearchGame;
    private readonly engine: MctsEngine<CatanSearchState, CatanSearchAction>;

    constructor(
        G: GameState,
        coach: Coach,
        profile: BotProfile = BALANCED_PROFILE,
        config: BotCoachConfig = {}
    ) {
        this.G = G;
        this.coach = coach;
        this.profile = profile;
        this.config = config;

        const scorer = new MoveScorer();
        this.filter = new OptimalMoveFilter(G, coach, profile, scorer);

        const explorationConstant = config.explorationConstant ?? 1.414;
        const weights = config.evaluatorWeights ?? CATAN_MCTS_EVALUATOR_WEIGHTS;

        const evaluator = new CatanEvaluator(weights);
        const rolloutPolicy = new CatanRolloutPolicy({ evaluator });
        const selectionPolicy = new UctSelectionPolicy<CatanSearchState, CatanSearchAction>({
            explorationConstant,
        });

        this.searchGame = new CatanSearchGame();
        this.engine = new MctsEngine<CatanSearchState, CatanSearchAction>({
            selectionPolicy,
            evaluator,
            rolloutPolicy,
        });
    }

    /**
     * Executes framework-neutral Catan search for the active player using CatanSearchGame and MctsEngine.
     * Returns the complete SearchResult diagnostics contract.
     */
    public search(
        playerID: string,
        ctx: GameContext,
        configOverride: Partial<BotCoachConfig> = {}
    ): SearchResult<CatanSearchAction> {
        // If the player is not current player, return empty result to respect active player turn boundary
        if (playerID !== ctx.currentPlayer) {
            return {
                action: null,
                rootPlayer: ctx.currentPlayer,
                iterations: 0,
                rootVisits: 0,
                candidates: [],
                seed: configOverride.seed ?? this.config.seed,
                elapsedMs: 0,
            };
        }

        const searchState: CatanSearchState = { game: this.G, context: ctx };
        const iterations = configOverride.iterations ?? this.config.iterations ?? 100;
        const maxDepth =
            configOverride.playoutDepth ??
            configOverride.maxDepth ??
            this.config.playoutDepth ??
            this.config.maxDepth ??
            10;
        const seed = configOverride.seed ?? this.config.seed;
        const explorationConstant =
            configOverride.explorationConstant ?? this.config.explorationConstant ?? 1.414;

        return this.engine.search(this.searchGame, searchState, {
            iterations,
            maxDepth,
            seed,
            explorationConstant,
        });
    }

    /**
     * Generates strategic recommendations and explanations by wrapping Catan search diagnostics.
     */
    public getRecommendation(
        playerID: string,
        ctx: GameContext,
        configOverride: Partial<BotCoachConfig> = {}
    ): BotCoachRecommendation {
        const result = this.search(playerID, ctx, configOverride);

        let explanation: string;
        if (!result.action) {
            explanation = 'No action recommended (inactive player or game is in a terminal state).';
        } else {
            const argsText =
                result.action.args && result.action.args.length > 0
                    ? ` (${result.action.args.join(', ')})`
                    : '';
            explanation = `Recommended action: ${result.action.move}${argsText} (evaluated over ${result.iterations} iterations, ${result.rootVisits} root visits).`;
        }

        return {
            selectedAction: result.action,
            explanation,
            result,
        };
    }

    /**
     * Filters and sorts a list of available moves to find the "optimal" ones.
     * Integrates Catan search candidate rankings when available, falling back to OptimalMoveFilter heuristic scoring.
     * @param allMoves The full list of legal moves
     * @param playerID The player ID
     * @param ctx The game context object
     * @returns A sorted list of optimal moves (best first)
     */
    public filterOptimalMoves(allMoves: GameAction[], playerID: string, ctx: GameContext): GameAction[] {
        const filtered = this.filter.filterOptimalMoves(allMoves, playerID, ctx);
        if (!filtered || filtered.length === 0) return [];

        // Attempt Catan search ranking integration
        try {
            const searchResult = this.search(playerID, ctx, { iterations: 20 });
            if (searchResult.candidates && searchResult.candidates.length > 0) {
                // Map candidate moves to input actions
                const candidateOrderMap = new Map<string, number>();
                searchResult.candidates.forEach((cand, idx) => {
                    const key = `${cand.action.move}:${cand.action.args.join(',')}`;
                    candidateOrderMap.set(key, idx);
                });

                // Helper to extract key from GameAction
                const getActionKey = (action: GameAction): string => {
                    if ('payload' in action) {
                        return `${action.payload.type}:${(action.payload.args || []).join(',')}`;
                    } else {
                        return `${action.move}:${(action.args || []).join(',')}`;
                    }
                };

                // Check if any candidate keys match our filtered moves
                const matchesAny = filtered.some(m => candidateOrderMap.has(getActionKey(m)));
                if (matchesAny) {
                    return [...filtered].sort((a, b) => {
                        const rankA = candidateOrderMap.get(getActionKey(a)) ?? 999;
                        const rankB = candidateOrderMap.get(getActionKey(b)) ?? 999;
                        return rankA - rankB;
                    });
                }
            }
        } catch {
            // Fall back gracefully if search state is minimal/mock
        }

        return filtered;
    }
}
