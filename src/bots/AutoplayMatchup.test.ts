/**
 * @jest-environment jsdom
 */
import { Client, Local } from '../adapters/runtime/boardgame';
import { CatanGame } from '../game/Game';
import { BalancedBot } from './BalancedBot';
import { CatanMCTSRuntimeAdapter } from './CatanMCTSBot';
import { MonteCatanoBot } from './MonteCatanoBot';
import { BOT_CYCLE } from './botCycle';
import { enumerate } from '../game/rules/enumerator';
import { toGameContext } from '../adapters/runtime/boardgameMoves';
import { PHASES } from '../game/core/constants';
import { GameState, GameAction } from '../game/core/types';
import { Ctx } from '../adapters/runtime/boardgame';

const adaptedEnumerate = (G: GameState, ctx: Ctx, playerID: string): GameAction[] => {
    return enumerate(G, toGameContext(ctx), playerID);
};

describe('Autoplay Matchup: Balanced vs CatanMCTS vs MonteCatano', () => {
    describe('1. Configuration & Identities', () => {
        it('configures exactly three bot players for a 3-player autoplay game', () => {
            const numPlayers = 3;
            const numBots = 3;

            const startBotIndex = numPlayers - numBots;
            const botsResult: Record<string, any> = {};
            const botNamesResult: Record<string, string> = {};

            let botTypeIndex = 0;
            for (let i = startBotIndex; i < numPlayers; i++) {
                const botConfig = BOT_CYCLE[botTypeIndex % BOT_CYCLE.length];
                botsResult[i.toString()] = botConfig.class;
                botNamesResult[i.toString()] = botConfig.name;
                botTypeIndex++;
            }

            expect(Object.keys(botsResult)).toHaveLength(3);
            expect(Object.keys(botNamesResult)).toHaveLength(3);

            expect(botsResult['0']).toBe(BalancedBot);
            expect(botsResult['1']).toBe(CatanMCTSRuntimeAdapter);
            expect(botsResult['2']).toBe(MonteCatanoBot);

            expect(botNamesResult['0']).toBe('Balanced');
            expect(botNamesResult['1']).toBe('CatanMCTS');
            expect(botNamesResult['2']).toBe('MonteCatano');
        });
    });

    describe('2. Direct Bot Invocation', () => {
        it('invokes each bot through the autoplay path when active and receives a legal action payload', async () => {
            const client = Client({
                game: CatanGame,
                numPlayers: 3,
                debug: false,
            });
            client.start();

            const state = client.getState();
            expect(state).toBeDefined();
            if (!state) throw new Error('State is null');
            const activePlayer = state.ctx.currentPlayer;

            // Test BalancedBot
            const balanced = new BalancedBot({ enumerate: adaptedEnumerate });
            const resBalanced = await balanced.play(state, activePlayer);
            expect(resBalanced).toBeDefined();
            expect(resBalanced.action).toBeDefined();
            expect(resBalanced.action.type).toBe('MAKE_MOVE');
            expect(resBalanced.action.payload.type).toBe('placeSettlement');

            // Test CatanMCTSBot
            const mcts = new CatanMCTSRuntimeAdapter();
            const resMcts = await mcts.play(state, activePlayer);
            expect(resMcts).toBeDefined();
            expect(resMcts.action).toBeDefined();
            expect(resMcts.action.type).toBe('MAKE_MOVE');
            expect(resMcts.action.payload.type).toBe('placeSettlement');

            // Test MonteCatanoBot
            const monte = new MonteCatanoBot({ enumerate, game: CatanGame });
            const resMonte = await monte.play(state, activePlayer);
            expect(resMonte).toBeDefined();
            expect(resMonte.action).toBeDefined();
            expect(resMonte.action.type).toBe('MAKE_MOVE');
            expect(resMonte.action.payload.type).toBe('placeSettlement');

            client.stop();
        });
    });

    describe('3. Game Progression & Lifecycle', () => {
        it('progresses a seeded autoplay game beyond setup into gameplay phase', async () => {
            const multiplayer = Local();
            const clients: Record<string, any> = {
                '0': Client({ game: CatanGame, numPlayers: 3, playerID: '0', multiplayer, debug: false }),
                '1': Client({ game: CatanGame, numPlayers: 3, playerID: '1', multiplayer, debug: false }),
                '2': Client({ game: CatanGame, numPlayers: 3, playerID: '2', multiplayer, debug: false }),
            };

            Object.values(clients).forEach(c => c.start());

            const bots = {
                '0': new BalancedBot({ enumerate: adaptedEnumerate, seed: 'test-seed-123' }),
                '1': new CatanMCTSRuntimeAdapter({ seed: 'test-seed-123' }),
                '2': new MonteCatanoBot({ enumerate, game: CatanGame, seed: 'test-seed-123' }),
            };

            let steps = 0;
            const maxSteps = 100;

            while (steps < maxSteps) {
                const state = clients['0'].getState();
                if (!state || state.ctx.phase === PHASES.GAMEPLAY) {
                    break;
                }

                const activePlayers = state.ctx.activePlayers
                    ? Object.keys(state.ctx.activePlayers)
                    : [state.ctx.currentPlayer];

                let moved = false;
                for (const playerID of activePlayers) {
                    const bot = bots[playerID as keyof typeof bots];
                    const client = clients[playerID];
                    if (!bot || !client) continue;

                    const result = await bot.play(state, playerID);
                    if (result && result.action) {
                        const action = result.action;
                        const moveName = action.payload ? action.payload.type : action.type;
                        const args = action.payload ? action.payload.args : [];

                        if (moveName && client.moves[moveName]) {
                            client.moves[moveName](...args);
                            moved = true;
                            break;
                        }
                    }
                }

                if (!moved) break;
                steps++;
            }

            const stateAfterSetup = clients['0'].getState();
            expect(stateAfterSetup?.ctx.phase).toBe(PHASES.GAMEPLAY);

            Object.values(clients).forEach(c => c.stop());
        }, 30000);

        it('executes gameplay turns without infinite loops or invalid moves', async () => {
            const multiplayer = Local();
            const clients: Record<string, any> = {
                '0': Client({ game: CatanGame, numPlayers: 3, playerID: '0', multiplayer, debug: false }),
                '1': Client({ game: CatanGame, numPlayers: 3, playerID: '1', multiplayer, debug: false }),
                '2': Client({ game: CatanGame, numPlayers: 3, playerID: '2', multiplayer, debug: false }),
            };

            Object.values(clients).forEach(c => c.start());

            const bots = {
                '0': new BalancedBot({ enumerate: adaptedEnumerate, seed: 'gameplay-seed' }),
                '1': new CatanMCTSRuntimeAdapter({ seed: 'gameplay-seed' }),
                '2': new MonteCatanoBot({ enumerate, game: CatanGame, seed: 'gameplay-seed' }),
            };

            let steps = 0;
            const maxSteps = 30;
            let turnProgressedInGameplay = false;

            while (steps < maxSteps) {
                const state = clients['0'].getState();
                if (!state || state.ctx.gameover) break;

                if (state.ctx.phase === PHASES.GAMEPLAY) {
                    turnProgressedInGameplay = true;
                }

                const activePlayers = state.ctx.activePlayers
                    ? Object.keys(state.ctx.activePlayers)
                    : [state.ctx.currentPlayer];

                let moved = false;
                for (const playerID of activePlayers) {
                    const bot = bots[playerID as keyof typeof bots];
                    const client = clients[playerID];
                    if (!bot || !client) continue;

                    const result = await bot.play(state, playerID);
                    if (result && result.action) {
                        const action = result.action;
                        const moveName = action.payload ? action.payload.type : action.type;
                        const args = action.payload ? action.payload.args : [];

                        if (moveName && client.moves[moveName]) {
                            client.moves[moveName](...args);
                            moved = true;
                            break;
                        }
                    }
                }

                if (!moved) break;
                steps++;
            }

            expect(turnProgressedInGameplay).toBe(true);
            const finalState = clients['0'].getState();
            expect(finalState).toBeDefined();

            Object.values(clients).forEach(c => c.stop());
        }, 30000);
    });
});
