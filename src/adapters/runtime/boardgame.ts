/**
 * Dependency gateway for boardgame.io APIs still required by runtime composition
 * and AI implementations. Application modules must not import the package directly.
 */
export { Bot, MCTSBot, RandomBot } from 'boardgame.io/ai';
// AI migration is owned by #471; these types are quarantined to bot runtime code.
export type { Game, Ctx } from 'boardgame.io';
