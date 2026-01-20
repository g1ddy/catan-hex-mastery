import { CatanBot, CatanBotConfig } from './CatanBot';
import { DEFENSIVE_PROFILE } from './profiles/BotProfile';

export class DefensiveBot extends CatanBot {
    constructor(config: CatanBotConfig = { enumerate: () => [] }) {
        super(config, DEFENSIVE_PROFILE);
    }
}
