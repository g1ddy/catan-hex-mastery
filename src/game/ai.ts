import { Ctx } from 'boardgame.io';
import { GameState } from './types';
import { STAGES } from './constants';
import { Coach } from './analysis/coach';
import { BotCoach, BotMove } from '../bots/BotCoach';

/**
 * Shared logic for enumerating moves using the BotCoach.
 * This is used by the Game definition (for RandomBot/MCTS) and DebugBot.
 *
 * @param G The game state
 * @param ctx The game context
 * @param playerID The ID of the player to enumerate moves for
 * @param baseEnumerate Optional fallback function (e.g. RandomBot's enumerate) if no heuristic move is found
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const enumerateMoves = (G: GameState, ctx: Ctx & { coach?: Coach }, playerID: string, baseEnumerate?: (...args: any[]) => any) => {
    // Validate playerID to prevent prototype pollution
    // eslint-disable-next-line no-prototype-builtins
    if (Object.prototype.hasOwnProperty.call(playerID, '__proto__') || playerID === 'constructor' || playerID === 'prototype') {
        console.warn('Invalid playerID:', playerID);
        return [];
    }

    const stage = ctx.activePlayers?.[playerID] || STAGES.ROLLING;

    // Use ctx.coach if available (Plugin), otherwise fall back to creating a transient instance
    let coach = ctx.coach;
    if (!coach) {
        // console.warn('ctx.coach is undefined. Creating a transient Coach instance. This may be inefficient.');
        coach = new Coach(G);
    }

    const botCoach = new BotCoach(G, coach);
    let recommendation: BotMove | null = null;

    switch (stage) {
        case STAGES.PLACE_SETTLEMENT:
            recommendation = botCoach.recommendSettlementPlacement(playerID);
            break;
        case STAGES.PLACE_ROAD:
            recommendation = botCoach.recommendRoadPlacement(playerID);
            break;
        case STAGES.ROLLING:
            return [{ move: 'rollDice', args: [] }];
        case STAGES.ACTING:
            recommendation = botCoach.recommendNextMove(playerID);
            break;
    }

    if (recommendation) {
        return [recommendation];
    }

    // Fallback to provided base behavior if passed
    if (baseEnumerate) {
        return baseEnumerate(G, ctx, playerID);
    }

    return [];
};
