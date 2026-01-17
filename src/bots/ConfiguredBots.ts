import { MCTSBot } from 'boardgame.io/ai';
import { Game } from 'boardgame.io';

interface BotConfig {
    game: Game;
    enumerate: Function;
    seed?: string | number;
    playerID?: string;
    [key: string]: any;
}

export class ConfiguredMCTSBot extends MCTSBot {
    constructor(config: BotConfig) {
        super({
            ...config,
            iterations: 100,
            playoutDepth: 10
        });
    }
}
