import { MCTSBot } from 'boardgame.io/ai';
import { Game, Ctx } from 'boardgame.io';
import { GameState, GameAction } from '../game/core/types';
import { WINNING_SCORE } from '../game/core/constants';
import { calculatePlayerPotentialPips } from '../game/analysis/analyst';

const pipsCache = new WeakMap<GameState, Record<string, Record<string, number>>>();

function getPlayerPotentialPips(gameState: GameState): Record<string, Record<string, number>> {
    let cached = pipsCache.get(gameState);
    if (!cached) {
        cached = calculatePlayerPotentialPips(gameState);
        pipsCache.set(gameState, cached);
    }
    return cached;
}

interface BotConfig {
    game: Game;
    enumerate: (G: GameState, ctx: Ctx, playerID: string) => GameAction[];
    seed?: string | number;
    playerID?: string;
    [key: string]: any;
}

export class MonteCatanoBot extends MCTSBot {
    constructor(config: BotConfig) {
        super({
            ...config,
            iterations: 200, // Higher iterations
            playoutDepth: 50, // Constrained depth
            objectives: (_G: GameState, _ctx: Ctx, playerID: string | undefined) => {
                if (!playerID) {
                    return {};
                }

                const objectives: Record<string, { checker: (G: GameState) => boolean, weight: number }> = {};

                // 1. Base VP Objectives (scaled down slightly so heuristics can matter)
                for (let i = 1; i <= WINNING_SCORE; i++) {
                    objectives[`VP_${i}`] = {
                        checker: (gameState: GameState) => {
                            const player = gameState.players[playerID];
                            return !!player && player.victoryPoints >= i;
                        },
                        weight: 5.0 + i, // Base VP weight
                    };
                }

                // 2. Heuristic Objectives: Pip Production (Engine Building)
                const pipThresholds = [5, 10, 15, 20, 25];
                pipThresholds.forEach(threshold => {
                    objectives[`PIPS_${threshold}`] = {
                        checker: (gameState: GameState) => {
                            const pipsByPlayer = getPlayerPotentialPips(gameState);
                            const myPips = pipsByPlayer[playerID] || {};
                            const totalPips = Object.values(myPips).reduce((a, b) => a + b, 0);
                            return totalPips >= threshold;
                        },
                        weight: threshold * 0.5, // E.g., 20 pips gives 10 weight
                    };
                });

                // 3. Heuristic Objectives: Resource Diversity / Synergy
                // Reward having at least SOME production in critical resources (Ore/Wheat)
                objectives['HAS_ORE_AND_WHEAT'] = {
                    checker: (gameState: GameState) => {
                        const pipsByPlayer = getPlayerPotentialPips(gameState);
                        const myPips = pipsByPlayer[playerID] || {};
                        return (myPips.ore || 0) > 0 && (myPips.wheat || 0) > 0;
                    },
                    weight: 8.0,
                };

                objectives['HAS_BRICK_AND_WOOD'] = {
                    checker: (gameState: GameState) => {
                        const pipsByPlayer = getPlayerPotentialPips(gameState);
                        const myPips = pipsByPlayer[playerID] || {};
                        return (myPips.brick || 0) > 0 && (myPips.wood || 0) > 0;
                    },
                    weight: 5.0,
                };

                // 4. Infrastructure Scaling
                objectives['HAS_MULTIPLE_CITIES'] = {
                    checker: (gameState: GameState) => {
                        const player = gameState.players[playerID];
                        if (!player) return false;
                        let cityCount = 0;
                        player.settlements.forEach(vId => {
                            const v = gameState.board.vertices[vId];
                            if (v && v.type === 'city') cityCount++;
                        });
                        return cityCount >= 2;
                    },
                    weight: 15.0,
                };

                // 5. Expansion potential (Road Network size)
                objectives['ROAD_LENGTH_5'] = {
                    checker: (gameState: GameState) => {
                        const player = gameState.players[playerID];
                        return !!player && player.roads.length >= 5;
                    },
                    weight: 5.0,
                };

                return objectives;
            }
        });
    }
}
