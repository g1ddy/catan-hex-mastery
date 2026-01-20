/**
 * @jest-environment jsdom
 */
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { CatanGame } from './Game';
import { CatanBot } from '../bots/CatanBot';
import { CoachPlugin } from './analysis/CoachPlugin';
import { enumerate } from './ai/enumerator';
import { STAGES } from './constants';

describe('Game Simulation with CatanBot', () => {
  it('should run a 2-player game without crashing', async () => {
    // We create separate clients for each player to properly simulate player identity
    const client0 = Client({
      game: CatanGame,
      numPlayers: 2,
      playerID: '0',
      multiplayer: Local(),
    });
    const client1 = Client({
      game: CatanGame,
      numPlayers: 2,
      playerID: '1',
      multiplayer: Local(),
    });

    client0.start();
    client1.start();

    const bots = {
      '0': new CatanBot({ enumerate }),
      '1': new CatanBot({ enumerate }),
    };

    const MAX_STEPS = 500;
    let steps = 0;

    // Helper to get synced state (should be same for both in local/local mode usually)
    const getState = () => client0.getState();

    console.log('--- STARTING SIMULATION ---');

    while (!getState()?.ctx.gameover && steps < MAX_STEPS) {
      const state = getState();
      if (!state) break;

      // Determine who needs to move
      let activePlayers: string[] = [];

      if (state.ctx.activePlayers) {
          activePlayers = Object.keys(state.ctx.activePlayers);
      } else {
          activePlayers = [state.ctx.currentPlayer];
      }

      console.log(`[Step ${steps}] Turn: ${state.ctx.turn} | Phase: ${state.ctx.phase} | Active: ${JSON.stringify(activePlayers)} | RollStatus: ${state.G.rollStatus} | Notification: ${state.G.notification?.type}`);
      if (state.G.playersToDiscard.length > 0) {
          console.log(`[Step ${steps}] Players to discard: ${JSON.stringify(state.G.playersToDiscard)}`);
      }

      // In simulation, we just pick the first active player to make a move this tick
      // Ideally we would cycle through them, but for crash testing linear is fine
      // provided we handle simultaneous stages (DISCARD) correctly.
      // If multiple players are active, let's iterate them.

      let moved = false;

      for (const playerID of activePlayers) {
          const bot = bots[playerID as keyof typeof bots];
          if (!bot) continue;

          // Check current stage for this player
          // const stage = state.ctx.activePlayers ? state.ctx.activePlayers[playerID] : 'default';
          // console.log(`  > Querying Bot ${playerID} (Stage: ${stage})...`);

          // Inject Coach Plugin
          const enhancedCtx = {
              ...state.ctx,
              coach: CoachPlugin.api({ G: state.G, ctx: state.ctx })
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const enhancedState = { ...state, ctx: enhancedCtx } as any;

          const result = await bot.play(enhancedState, playerID);
          if (result && result.action) {
              const { action } = result;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const moveName = (action as any).payload?.type || (action as any).move;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const args = (action as any).payload?.args || (action as any).args || [];

              console.log(`  > Bot ${playerID} chose: ${moveName}`, args);

              const client = playerID === '0' ? client0 : client1;

              if (moveName && moveName in client.moves) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (client.moves[moveName] as any)(...args);
                  moved = true;
                  // Break after one move to re-evaluate state (e.g. stage transition)
                  // Unless strictly simultaneous, but boardgame.io updates state per move.
                  break;
              } else {
                  console.error(`  > ERROR: Bot ${playerID} tried invalid/unknown move: ${moveName}`);
              }
          } else {
             console.log(`  > Bot ${playerID} returned NO move.`);
          }
      }

      if (!moved) {
          // If no one moved, check if it's because bots are passive or game is stuck
          // In DISCARD, bots should move. If they don't, break to avoid infinite loop.
          // But allow a few retries or check if state changed?
          // For this test, we just break if we are truly stuck.
          console.log(`No active bot returned a move at step ${steps}. GAME STUCK?`);

          // Dump resources if stuck in discard
          if (activePlayers.some(p => state.ctx.activePlayers?.[p] === STAGES.DISCARD)) {
              activePlayers.forEach(pid => {
                 const p = state.G.players[pid];
                 const total = Object.values(p.resources).reduce((a,b) => a+b, 0);
                 console.log(`  > Player ${pid} Resources: ${JSON.stringify(p.resources)} (Total: ${total})`);
              });
          }

          break;
      }

      steps++;
    }

    expect(steps).toBeGreaterThan(0);
    console.log('--- END SIMULATION ---');
  });
});
