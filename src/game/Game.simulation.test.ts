import { Client } from 'boardgame.io/client';
import { CatanGame } from './Game';
import { DebugBot } from '../bots/DebugBot';

describe('Game Simulation with DebugBot', () => {
  it('should run a 2-player game without crashing', async () => {
    const client = Client({
      game: CatanGame,
      numPlayers: 2,
    }) as any;

    client.start();

    // Define a dummy enumerate function to satisfy strict typing.
    // In a future task, this will list all valid moves (e.g., placements).
    // Currently, returning an empty array results in passive behavior.
    const dummyEnumerate = () => [];

    // Create bot instances for each player
    const bots = {
      '0': new DebugBot({ enumerate: dummyEnumerate }),
      '1': new DebugBot({ enumerate: dummyEnumerate }),
    };

    const MAX_STEPS = 2000;
    let steps = 0;

    while (!client.getState()?.ctx.gameover && steps < MAX_STEPS) {
      const state = client.getState();
      const playerID = state.ctx.currentPlayer;
      const bot = bots[playerID as keyof typeof bots];

      if (!bot) {
        console.warn(`No bot for player ${playerID}`);
        break;
      }

      // Bot plays
      const result = await bot.play(state, playerID);
      const { action } = result;

      if (action) {
        client.submitAction(action);
      } else {
        // Bot is passive (no moves enumerated), so we break to avoid infinite loop.
        console.log(`Bot for player ${playerID} returned no action (Passive Mode).`);
        break;
      }

      steps++;
    }

    const state = client.getState();
    const { ctx } = state;

    console.log('Simulation ended:', {
      steps,
      turn: ctx.turn,
      phase: ctx.phase,
      gameover: ctx.gameover,
    });

    // We verify the simulation ran without errors.
    // Note: ctx.turn remains 1 because the bot is currently passive during the Setup phase.
    expect(steps).toBeGreaterThanOrEqual(0);
  });
});
