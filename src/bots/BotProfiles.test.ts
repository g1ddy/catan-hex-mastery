import { BalancedBot } from './BalancedBot';
import { AggressiveBot } from './AggressiveBot';
import { DefensiveBot } from './DefensiveBot';
import { ExpansiveBot } from './ExpansiveBot';
import { BALANCED_PROFILE, AGGRESSIVE_PROFILE, DEFENSIVE_PROFILE, EXPANSIVE_PROFILE } from './profiles/BotProfile';

describe('Bot Profiles', () => {
    const testCases = [
        { Bot: BalancedBot, profile: BALANCED_PROFILE, name: 'BalancedBot' },
        { Bot: AggressiveBot, profile: AGGRESSIVE_PROFILE, name: 'AggressiveBot' },
        { Bot: DefensiveBot, profile: DEFENSIVE_PROFILE, name: 'DefensiveBot' },
        { Bot: ExpansiveBot, profile: EXPANSIVE_PROFILE, name: 'ExpansiveBot' },
    ];

    testCases.forEach(({ Bot, profile, name }) => {
        it(`${name} should have the correct profile`, () => {
            const bot = new Bot();
            // Accessing protected member via 'any' for testing
            expect((bot as any).profile).toEqual(profile);
        });
    });
});
