import { CatanBot, CatanBotConfig } from './CatanBot';
import { EXPANSIVE_PROFILE } from './profiles/BotProfile';

export class ExpansiveBot extends CatanBot {
    constructor(config: CatanBotConfig = { enumerate: () => [] }) {
        super(config, EXPANSIVE_PROFILE);
    }
}
