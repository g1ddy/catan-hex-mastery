/**
 * @jest-environment jsdom
 */
import { Client } from 'boardgame.io/client';
import { CatanGame } from './Game';
import { CatanBot } from '../bots/CatanBot';
import { CoachPlugin } from './analysis/CoachPlugin';
import { enumerate } from './ai/enumerator';

describe('Game Simulation with CatanBot', () => {
  it('should run a 2-player game without crashing', async () => {
    const client = Client({
      game: CatanGame,
      numPlayers: 2,
    });

    client.start();

    // Use the centralized enumerate function from ai.ts
    // This allows the bot to actually find valid moves during the simulation.

    // Create bot instances for each player
    const bots = {
      '0': new CatanBot({ enumerate }),
      '1': new CatanBot({ enumerate }),
    };

    const MAX_STEPS = 200; // Reduced for unit test speed
    let steps = 0;

    while (!client.getState()?.ctx.gameover && steps < MAX_STEPS) {
      const state = client.getState();
      if (!state) {
        console.warn('Game state is missing');
        break;
      }

      const playerID = state.ctx.currentPlayer;
      const bot = bots[playerID as keyof typeof bots];

      if (!bot) {
        console.warn(`No bot for player ${playerID}`);
        break;
      }

      // Inject Coach Plugin into Context for the Bot
      const enhancedCtx = {
          ...state.ctx,
          coach: CoachPlugin.api({ G: state.G, ctx: state.ctx })
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enhancedState = { ...state, ctx: enhancedCtx } as any;

      // Bot plays
      const result = await bot.play(enhancedState, playerID);

      if (!result || !result.action) {
         // Bot is passive (no moves enumerated), so we break to avoid infinite loop.
        console.log(`Bot for player ${playerID} returned no action (Passive Mode).`);
        break;
      }

      const { action } = result;

      if (action) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const moveName = (action as any).payload?.type || (action as any).move;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const args = (action as any).payload?.args || (action as any).args || [];

        if (moveName && moveName in client.moves) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const move = moveName as keyof typeof client.moves;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (client.moves[move] as any)(...args);
        } else {
          // Bot suggested an invalid move or one not exposed on client.moves
          console.warn(`Bot for player ${playerID} suggested an invalid move: ${moveName}`);
          break;
        }
      }

      steps++;
    }

    const finalState = client.getState();
    if (!finalState) throw new Error('Game ended with missing state');

    const { ctx } = finalState;

    console.log('Simulation ended:', {
      steps,
      turn: ctx.turn,
      phase: ctx.phase,
      gameover: ctx.gameover,
    });

    // We verify the simulation ran without errors and that the bot made moves
    expect(steps).toBeGreaterThan(0);
  });
});
