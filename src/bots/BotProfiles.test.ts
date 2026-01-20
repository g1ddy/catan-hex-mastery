import { BalancedBot } from './BalancedBot';
import { AggressiveBot } from './AggressiveBot';
import { DefensiveBot } from './DefensiveBot';
import { ExpansiveBot } from './ExpansiveBot';
import { BALANCED_PROFILE, AGGRESSIVE_PROFILE, DEFENSIVE_PROFILE, EXPANSIVE_PROFILE } from './profiles/BotProfile';

describe('Bot Profiles', () => {
    it('BalancedBot should have BALANCED_PROFILE', () => {
        const bot = new BalancedBot();
        // Accessing protected member via 'any' for testing
        expect((bot as any).profile).toEqual(BALANCED_PROFILE);
    });

    it('AggressiveBot should have AGGRESSIVE_PROFILE', () => {
        const bot = new AggressiveBot();
        expect((bot as any).profile).toEqual(AGGRESSIVE_PROFILE);
    });

    it('DefensiveBot should have DEFENSIVE_PROFILE', () => {
        const bot = new DefensiveBot();
        expect((bot as any).profile).toEqual(DEFENSIVE_PROFILE);
    });

    it('ExpansiveBot should have EXPANSIVE_PROFILE', () => {
        const bot = new ExpansiveBot();
        expect((bot as any).profile).toEqual(EXPANSIVE_PROFILE);
    });
});
