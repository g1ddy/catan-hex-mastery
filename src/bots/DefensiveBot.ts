import { CatanBot } from './CatanBot';
import { DEFENSIVE_PROFILE } from './profiles/BotProfile';
import { GameState, GameAction } from '../game/types';
import { Ctx } from 'boardgame.io';

export class DefensiveBot extends CatanBot {
    constructor(config: { enumerate: (G: GameState, ctx: Ctx, playerID: string) => GameAction[]; seed?: string | number } = { enumerate: () => [] }) {
        super(config, DEFENSIVE_PROFILE);
    }
}
