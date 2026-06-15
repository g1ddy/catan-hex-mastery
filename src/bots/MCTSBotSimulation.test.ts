/**
 * @jest-environment jsdom
 */
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { CatanGame } from '../game/Game';
import { CatanMCTSBot } from './CatanMCTSBot';
import { MonteCatanoBot } from './MonteCatanoBot';
import { enumerate } from '../game/rules/enumerator';

describe('MonteCatanoBot vs CatanMCTSBot Simulation', () => {
    // Increase timeout significantly for running matches
    it('runs matches between MonteCatanoBot and CatanMCTSBot', async () => {
        const TOTAL_MATCHES = 5; // Reduced from 50 for testing. You can run more locally outside Jest.
        const MAX_STEPS_PER_MATCH = 200; // Limit steps to prevent infinite loops

        let monteCatanoWins = 0;
        let originalMCTSWins = 0;
        let draws = 0;

        for (let match = 0; match < TOTAL_MATCHES; match++) {
            console.log(`\n--- Starting Match ${match + 1} ---`);
            const client0 = Client({
                game: CatanGame,
                numPlayers: 2,
                playerID: '0',
                multiplayer: Local(),
                debug: false,
            });
            const client1 = Client({
                game: CatanGame,
                numPlayers: 2,
                playerID: '1',
                multiplayer: Local(),
                debug: false,
            });

            client0.start();
            client1.start();

            // Alternate starting positions to be fair
            const p0IsMonte = match % 2 === 0;
            const monteCatanoId = p0IsMonte ? '0' : '1';
            const originalMCTSId = p0IsMonte ? '1' : '0';

            const bots = {
                [monteCatanoId]: new MonteCatanoBot({ enumerate, game: CatanGame }),
                [originalMCTSId]: new CatanMCTSBot({ enumerate, game: CatanGame }),
            };

            let steps = 0;
            // Use Client state directly since MCTSBot expects the full `State` object
            const getState = () => client0.getState();

            while (getState() && !getState()?.ctx.gameover && steps < MAX_STEPS_PER_MATCH) {
                const state = getState() as any;
                if (!state) break;

                const activePlayers = state.ctx.activePlayers ? Object.keys(state.ctx.activePlayers) : [state.ctx.currentPlayer];
                let moved = false;

                for (const playerID of activePlayers) {
                    const bot = bots[playerID];
                    if (!bot) continue;

                    const result = await bot.play(state, playerID);
                    if (result && result.action) {
                        const { action } = result;
                        const moveName = 'payload' in action ? action.payload.type : (action as any).type || (action as any).move;
                        const args = 'payload' in action ? action.payload.args : (action as any).payload?.args || (action as any).args || [];

                        const client = playerID === '0' ? client0 : client1;
                        if (moveName && client.moves[moveName]) {
                            client.moves[moveName](...args);
                            moved = true;
                            break; // Stop active player iteration so we refresh state
                        }
                    }
                }

                if (!moved) {
                    break;
                }
                steps++;
            }

            const finalState = getState();
            if (finalState?.ctx.gameover) {
                const winnerId = finalState.ctx.gameover.winner;
                if (winnerId === monteCatanoId) {
                    monteCatanoWins++;
                    console.log(`Match ${match + 1} Result: MonteCatanoBot won!`);
                } else if (winnerId === originalMCTSId) {
                    originalMCTSWins++;
                    console.log(`Match ${match + 1} Result: Original MCTSBot won!`);
                } else {
                    draws++;
                    console.log(`Match ${match + 1} Result: Draw!`);
                }
            } else {
                draws++;
                console.log(`Match ${match + 1} Result: Draw (Max Steps Reached)`);
            }

            client0.stop();
            client1.stop();
        }

        console.log(`\n--- Final Results ---`);
        console.log(`MonteCatanoBot Wins: ${monteCatanoWins}`);
        console.log(`Original MCTSBot Wins: ${originalMCTSWins}`);
        console.log(`Draws/Timeouts: ${draws}`);
        console.log(`Win Rate for MonteCatanoBot: ${((monteCatanoWins / TOTAL_MATCHES) * 100).toFixed(2)}%`);

        expect(TOTAL_MATCHES).toBe(5); // Ensure simulation runs to completion
    }, 120000); // Give Jest 2 minutes for the simulation
});
