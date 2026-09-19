import { Bot, Ctx } from '../adapters/runtime/boardgame';
import { GameState, MakeMoveAction } from '../game/core/types';
import { toGameContext } from '../adapters/runtime/boardgameMoves';
import { CatanSearchGame } from '../game/ai/catan/CatanSearchGame';
import type { CatanSearchState } from '../game/ai/catan/CatanSearchState';
import type { CatanSearchAction } from '../game/ai/catan/CatanSearchAction';
import { CatanEvaluator, CatanEvaluatorWeights } from '../game/ai/catan/CatanEvaluator';
import { CatanRolloutPolicy } from '../game/ai/catan/CatanRolloutPolicy';
import { MctsEngine } from '../game/ai/search/MctsEngine';
import { UctSelectionPolicy } from '../game/ai/search/UctSelectionPolicy';

/**
 * Evaluator weights for MonteCatanoBot.
 * Unlike CatanMCTSBot's baseline weights (which focus only on VPs and structures),
 * MonteCatanoBot incorporates richer strategic signals including production pips,
 * resource diversity, resource synergies (Ore+Wheat and Wood+Brick), city scaling,
 * road expansion, settlement opportunities, and port access.
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
 * Does NOT extend boardgame.io's Bot class and has no boardgame.io dependencies.
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
    this.maxDepth = fullConfig.playoutDepth ?? fullConfig.maxDepth ?? 50;
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

  async play(state: { G: GameState; ctx: Ctx }, playerID: string): Promise<any> {
    const { G } = state;
    const context = toGameContext(state.ctx);

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

/**
 * Thin runtime adapter to expose the Catan-owned MonteCatanoBot
 * to boardgame.io's Bot architecture where still required by the runtime.
 */
export class MonteCatanoRuntimeAdapter extends Bot {
  private readonly innerBot: MonteCatanoBot;

  constructor(config: Record<string, any> = {}) {
    // boardgame.io/ai Bot base class expects enumerate, although we don't use it.
    super({ enumerate: () => [], ...config });
    this.innerBot = new MonteCatanoBot(config as MonteCatanoBotConfig);
  }

  async play(state: { G: GameState; ctx: Ctx }, playerID: string): Promise<any> {
    return this.innerBot.play(state, playerID);
  }
}
