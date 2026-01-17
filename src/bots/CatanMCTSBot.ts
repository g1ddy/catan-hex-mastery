import { MCTSBot } from 'boardgame.io/ai';
import { Game, Ctx } from 'boardgame.io';
import { GameState, GameAction } from '../game/types';
import { WINNING_SCORE } from '../game/constants';

interface BotConfig {
    game: Game;
    enumerate: (G: GameState, ctx: Ctx, playerID: string) => GameAction[];
    seed?: string | number;
    playerID?: string;
    [key: string]: any;
}

export class CatanMCTSBot extends MCTSBot {
    constructor(config: BotConfig) {
        super({
            ...config,
            iterations: 100,
            playoutDepth: 10,
            objectives: (_G: GameState, _ctx: any, playerID: string | undefined) => {
                if (!playerID) {
                    return {};
                }

                const objectives: Record<string, { checker: (G: GameState) => boolean, weight: number }> = {};

                // Create cumulative objectives for Victory Points (1 to WINNING_SCORE)
                // This encourages the bot to reach higher VP thresholds.
                for (let i = 1; i <= WINNING_SCORE; i++) {
                    objectives[`VP_${i}`] = {
                        checker: (gameState: GameState) => {
                            const player = Object.prototype.hasOwnProperty.call(gameState.players, playerID)
                                ? gameState.players[playerID]
                                : undefined;
                            return !!player && player.victoryPoints >= i;
                        },
                        // Increase weight as we get closer to winning to prioritize closing out the game
                        weight: 10.0 + (i * 2),
                    };
                }

                return objectives;
            }
        });
    }
}
