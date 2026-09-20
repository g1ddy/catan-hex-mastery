import { GameState, GameContext, MakeMoveAction } from '../game/core/types';
import { CatanSearchGame } from '../game/ai/catan/CatanSearchGame';
import type { CatanSearchState } from '../game/ai/catan/CatanSearchState';
import type { CatanSearchAction } from '../game/ai/catan/CatanSearchAction';
import { CatanEvaluator, CatanEvaluatorWeights } from '../game/ai/catan/CatanEvaluator';
import { CatanRolloutPolicy } from '../game/ai/catan/CatanRolloutPolicy';
import { MctsEngine } from '../game/ai/search/MctsEngine';
import { UctSelectionPolicy } from '../game/ai/search/UctSelectionPolicy';

/**
 * Evaluator weights for MonteCatanoBot.
 *
 * Note on Behavioral Approximation:
 * The weights defined below translate the legacy threshold-style heuristics of MonteCatanoBot
 * (e.g. discrete objectives for pip thresholds, diversity, Ore/Wheat and Wood/Brick synergies)
 * into continuous, weighted signals supported by CatanEvaluator.
 *
 * - The weights preserve the important strategic signals of the old MonteCatano behavior
 *   (engine building, resource diversity, key synergies, cities, and road expansion).
 * - The new evaluator is a continuous/weighted approximation of the old heuristic objective.
 * - Exact reproduction of every legacy threshold is intentionally out of scope for #483.
 * - Expanding the generic evaluator/search architecture is not part of this PR.
 */
export const MONTE_CATANO_EVALUATOR_WEIGHTS: Partial<CatanEvaluatorWeights> = Object.freeze({
  victoryPoints: 10,
  productionPips: 2.5,
  resourceDiversity: 3,
  synergyOreWheat: 8,
  synergyWoodBrick: 5,
  cities: 15,
  settlements: 2,
  roadLength: 1,
  settlementSpots: 1,
  ports: 2,
  productionAdvantage: 1,
});

export interface MonteCatanoBotConfig {
  seed?: string | number;
  iterations?: number;
  playoutDepth?: number;
  maxDepth?: number;
  explorationConstant?: number;
  evaluatorWeights?: Partial<CatanEvaluatorWeights>;
}

const DEFAULT_CONFIG: MonteCatanoBotConfig = {
  iterations: 200,
  playoutDepth: 50,
  explorationConstant: 1.414,
};

/**
 * Framework-neutral Catan MonteCatanoBot.
 * Does NOT extend boardgame.io's Bot class and has no boardgame.io dependencies or imports.
 * Operates strictly on Catan-owned GameState and GameContext.
 */
export class MonteCatanoBot {
  public readonly iterations: number;
  public readonly maxDepth: number;
  public readonly explorationConstant: number;
  public readonly initialSeed?: string | number;
  public readonly evaluatorWeights: Partial<CatanEvaluatorWeights>;

  private readonly searchGame: CatanSearchGame;
  private readonly engine: MctsEngine<CatanSearchState, CatanSearchAction>;

  constructor(config: MonteCatanoBotConfig = {}) {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    this.iterations = fullConfig.iterations ?? 200;
    this.maxDepth = config.playoutDepth ?? config.maxDepth ?? DEFAULT_CONFIG.playoutDepth ?? 50;
    this.explorationConstant = fullConfig.explorationConstant ?? 1.414;
    this.initialSeed = fullConfig.seed;
    this.evaluatorWeights = fullConfig.evaluatorWeights ?? MONTE_CATANO_EVALUATOR_WEIGHTS;

    const evaluator = new CatanEvaluator(this.evaluatorWeights);
    const rolloutPolicy = new CatanRolloutPolicy({ evaluator });
    const selectionPolicy = new UctSelectionPolicy<CatanSearchState, CatanSearchAction>({
      explorationConstant: this.explorationConstant,
    });

    this.searchGame = new CatanSearchGame();
    this.engine = new MctsEngine<CatanSearchState, CatanSearchAction>({
      selectionPolicy,
      evaluator,
      rolloutPolicy,
    });
  }

  async play(state: { G: GameState; ctx: GameContext }, playerID: string): Promise<any> {
    const { G, ctx: context } = state;

    // Safety: Only act if player is current active player
    if (playerID !== context.currentPlayer) {
      return undefined;
    }

    const searchState: CatanSearchState = { game: G, context };

    const searchSeed =
      this.initialSeed !== undefined
        ? `${this.initialSeed}-${context.turn}-${context.phase}-${playerID}`
        : undefined;

    const result = this.engine.search(this.searchGame, searchState, {
      iterations: this.iterations,
      maxDepth: this.maxDepth,
      seed: searchSeed,
      explorationConstant: this.explorationConstant,
    });

    if (!result.action) {
      return undefined;
    }

    const selectedAction = result.action;

    return {
      action: {
        type: 'MAKE_MOVE' as const,
        payload: {
          type: selectedAction.move,
          args: selectedAction.args,
          playerID,
        } as MakeMoveAction['payload'],
      },
      metadata: { message: `MonteCatanoBot (${playerID})` },
      iterations: result.iterations,
      rootVisits: result.rootVisits,
    };
  }
}
