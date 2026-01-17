import { MCTSBot } from 'boardgame.io/ai';

export class ConfiguredMCTSBot extends MCTSBot {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(config: any) {
        // MCTSBot constructor might not accept rest arguments if strictly typed or if super expects specific args
        // But assuming standard Bot signature: constructor(config)
        // We just pass the modified config.
        super({
            ...config,
            iterations: 100,
            playoutDepth: 10
        });
    }
}
