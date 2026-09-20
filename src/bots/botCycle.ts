import { BalancedBot } from './BalancedBot';
import { AggressiveBot } from './AggressiveBot';
import { DefensiveBot } from './DefensiveBot';
import { ExpansiveBot } from './ExpansiveBot';
import { CatanMCTSRuntimeAdapter } from './CatanMCTSBot';
import { MonteCatanoRuntimeAdapter } from '../adapters/runtime/MonteCatanoBot';
import { RandomBot, Bot } from '../adapters/runtime/boardgame';

// Bot Cycling Order: Balanced -> CatanMCTS -> MonteCatano -> Aggressive -> Defensive -> Expansive -> Random
export const BOT_CYCLE: Array<{ class: typeof Bot, name: string }> = [
    { class: BalancedBot, name: 'Balanced' },
    { class: CatanMCTSRuntimeAdapter, name: 'CatanMCTS' },
    { class: MonteCatanoRuntimeAdapter, name: 'MonteCatano' },
    { class: AggressiveBot, name: 'Aggressive Bot' },
    { class: DefensiveBot, name: 'Defensive Bot' },
    { class: ExpansiveBot, name: 'Expansive Bot' },
    { class: RandomBot, name: 'Random Bot' }
];

export const BOT_SCENARIOS: Record<string, Array<{ class: typeof Bot, name: string }>> = {
    'fast-autoplay': [
        { class: BalancedBot, name: 'Balanced' },
        { class: AggressiveBot, name: 'Aggressive Bot' },
        { class: DefensiveBot, name: 'Defensive Bot' }
    ]
};
