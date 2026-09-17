import { BalancedBot } from './BalancedBot';
import { AggressiveBot } from './AggressiveBot';
import { DefensiveBot } from './DefensiveBot';
import { ExpansiveBot } from './ExpansiveBot';
import { CatanMCTSBot } from './CatanMCTSBot';
import { MonteCatanoBot } from './MonteCatanoBot';
import { RandomBot, Bot } from '../adapters/runtime/boardgame';

// Bot Cycling Order: Balanced -> CatanMCTS -> MonteCatano -> Aggressive -> Defensive -> Expansive -> Random
export const BOT_CYCLE: Array<{ class: typeof Bot, name: string }> = [
    { class: BalancedBot, name: 'Balanced' },
    { class: CatanMCTSBot, name: 'CatanMCTS' },
    { class: MonteCatanoBot, name: 'MonteCatano' },
    { class: AggressiveBot, name: 'Aggressive Bot' },
    { class: DefensiveBot, name: 'Defensive Bot' },
    { class: ExpansiveBot, name: 'Expansive Bot' },
    { class: RandomBot, name: 'Random Bot' }
];
