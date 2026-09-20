import { Bot, Ctx } from './boardgame';
import { GameState } from '../../game/core/types';
import { toGameContext } from './boardgameMoves';
import { MonteCatanoBot, MonteCatanoBotConfig } from '../../bots/MonteCatanoBot';

/**
 * Thin runtime adapter to expose the framework-neutral MonteCatanoBot
 * to boardgame.io's Bot architecture where required by the runtime.
 */
export class MonteCatanoRuntimeAdapter extends Bot {
  private readonly innerBot: MonteCatanoBot;

  constructor(config: Record<string, any> = {}) {
    // boardgame.io/ai Bot base class expects enumerate, although we don't use it.
    super({ enumerate: () => [], ...config });
    this.innerBot = new MonteCatanoBot(config as MonteCatanoBotConfig);
  }

  async play(state: { G: GameState; ctx: Ctx }, playerID: string): Promise<any> {
    const context = toGameContext(state.ctx);
    return this.innerBot.play({ G: state.G, ctx: context }, playerID);
  }
}
