import { Bot, Game, Ctx } from '../adapters/runtime/boardgame';
import { GameState, MakeMoveAction } from '../game/core/types';
import { toGameContext } from '../adapters/runtime/boardgameMoves';
import { CatanGame } from '../game/Game';
import { CatanSearchGame } from '../game/ai/catan/CatanSearchGame';
import type { CatanSearchState } from '../game/ai/catan/CatanSearchState';
import type { CatanSearchAction } from '../game/ai/catan/CatanSearchAction';
import { CatanEvaluator, CatanEvaluatorWeights } from '../game/ai/catan/CatanEvaluator';
import { CatanRolloutPolicy } from '../game/ai/catan/CatanRolloutPolicy';
import { MctsEngine } from '../game/ai/search/MctsEngine';
import { UctSelectionPolicy } from '../game/ai/search/UctSelectionPolicy';

/**
 * Baseline evaluator weights for CatanMCTSBot.
 *
 * The legacy bot used cumulative VP-threshold objectives with increasing weights.
 * CatanEvaluator is intentionally a linear feature evaluator, so that exact
 * threshold objective cannot be represented without changing #480's evaluator
 * contract. Keep this migration deliberately VP-centric rather than introducing
 * new structural preferences: the baseline bot should continue to optimize game
 * progress toward victory, while richer structural/economic signals remain the
 * responsibility of MonteCatanoBot (#483).
 */
export const CATAN_MCTS_EVALUATOR_WEIGHTS: Partial<CatanEvaluatorWeights> = Object.freeze({
  victoryPoints: 10,
  cities: 0,
  settlements: 0,
  roadLength: 0,
  productionPips: 0,
  resourceDiversity: 0,
  synergyOreWheat: 0,
  synergyWoodBrick: 0,
  settlementSpots: 0,
  ports: 0,
  productionAdvantage: 0,
});

export interface BotConfig {
  game?: Game;
  enumerate?: (G: any, ctx: any, playerID: string) => any;
  seed?: string | number;
  playerID?: string;
  iterations?: number;
  playoutDepth?: number;
  maxDepth?: number;
  explorationConstant?: number;
  [key: string]: any;
}

const DEFAULT_CONFIG: BotConfig = {
  game: CatanGame,
  enumerate: () => [],
  iterations: 100,
  playoutDepth: 10,
  explorationConstant: 1.414,
};

export class CatanMCTSBot extends Bot {
  public readonly iterations: number;
  public readonly maxDepth: number;
  public readonly explorationConstant: number;
  public readonly initialSeed?: string | number;

  private readonly searchGame: CatanSearchGame;
  private readonly engine: MctsEngine<CatanSearchState, CatanSearchAction>;

  constructor(config: BotConfig = {}) {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    super(fullConfig as any);

    this.iterations = fullConfig.iterations ?? 100;
    this.maxDepth = fullConfig.playoutDepth ?? fullConfig.maxDepth ?? 10;
    this.explorationConstant = fullConfig.explorationConstant ?? 1.414;
    this.initialSeed = fullConfig.seed;

    const evaluator = new CatanEvaluator(CATAN_MCTS_EVALUATOR_WEIGHTS);
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
      metadata: { message: `CatanMCTSBot (${playerID})` },
    };
  }
}
