import { MCTSBot } from 'boardgame.io/ai';

export class ConfiguredMCTSBot extends MCTSBot {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(config: any, ...args: any[]) {
        super({
            ...config,
            iterations: 100,
            playoutDepth: 10
        }, ...args);
    }
}
