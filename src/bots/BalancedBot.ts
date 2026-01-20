import { CatanBot, CatanBotConfig } from './CatanBot';
import { BALANCED_PROFILE } from './profiles/BotProfile';

export class BalancedBot extends CatanBot {
    constructor(config: CatanBotConfig = { enumerate: () => [] }) {
        super(config, BALANCED_PROFILE);
    }
}
