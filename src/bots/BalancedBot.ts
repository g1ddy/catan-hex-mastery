import { CatanBot } from './CatanBot';
import { BALANCED_PROFILE } from './profiles/BotProfile';
import { GameState, GameAction } from '../game/types';
import { Ctx } from 'boardgame.io';

export class BalancedBot extends CatanBot {
    constructor(config: { enumerate: (G: GameState, ctx: Ctx, playerID: string) => GameAction[]; seed?: string | number } = { enumerate: () => [] }) {
        super(config, BALANCED_PROFILE);
    }
}
