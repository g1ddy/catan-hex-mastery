import { CatanBot } from './CatanBot';
import { EXPANSIVE_PROFILE } from './profiles/BotProfile';
import { GameState, GameAction } from '../game/types';
import { Ctx } from 'boardgame.io';

export class ExpansiveBot extends CatanBot {
    constructor(config: { enumerate: (G: GameState, ctx: Ctx, playerID: string) => GameAction[]; seed?: string | number } = { enumerate: () => [] }) {
        super(config, EXPANSIVE_PROFILE);
    }
}
