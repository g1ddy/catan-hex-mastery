import { CatanBot } from './CatanBot';
import { AGGRESSIVE_PROFILE } from './profiles/BotProfile';
import { GameState, GameAction } from '../game/types';
import { Ctx } from 'boardgame.io';

export class AggressiveBot extends CatanBot {
    constructor(config: { enumerate: (G: GameState, ctx: Ctx, playerID: string) => GameAction[]; seed?: string | number } = { enumerate: () => [] }) {
        super(config, AGGRESSIVE_PROFILE);
    }
}
