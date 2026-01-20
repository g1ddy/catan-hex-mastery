import { CatanBot, CatanBotConfig } from './CatanBot';
import { AGGRESSIVE_PROFILE } from './profiles/BotProfile';

export class AggressiveBot extends CatanBot {
    constructor(config: CatanBotConfig = { enumerate: () => [] }) {
        super(config, AGGRESSIVE_PROFILE);
    }
}
