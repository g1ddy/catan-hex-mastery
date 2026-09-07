/**
 * Dependency gateway for boardgame.io APIs still required by runtime composition
 * and AI implementations. Application modules must not import the package directly.
 */
export { Bot, MCTSBot, RandomBot } from 'boardgame.io/ai';
export type { Game, Ctx, Move } from 'boardgame.io';
