/**
 * @jest-environment jsdom
 */
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { Ctx } from 'boardgame.io';
import { CatanGame } from './Game';
import { CatanBot } from '../bots/CatanBot';
import { CoachPlugin } from './analysis/CoachPlugin';
import { enumerate } from './rules/enumerator';
import { GameState } from './core/types';

interface SimulationState {
    G: GameState;
    ctx: Ctx;
}

describe('Game Simulation with CatanBot', () => {
  it('should run a 2-player game without crashing', async () => {
    // We create separate clients for each player to properly simulate player identity
    const client0 = Client({
      game: CatanGame,
      numPlayers: 2,
      playerID: '0',
      multiplayer: Local(),
      debug: false, // Disable debug panel for cleaner test output & to avoid prototype pollution issues
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

    const bots = {
      '0': new CatanBot({ enumerate }),
      '1': new CatanBot({ enumerate }),
    };

    const MAX_STEPS = 500;
    let steps = 0;

    const getState = (): SimulationState | undefined => client0.getState() as unknown as SimulationState | undefined;

    console.log('--- STARTING SIMULATION ---');

    while (getState() && !getState()?.ctx.gameover && steps < MAX_STEPS) {
      const state = getState();
      if (!state) break;

      const activePlayers = state.ctx.activePlayers ? Object.keys(state.ctx.activePlayers) : [state.ctx.currentPlayer];

      console.log(`[Step ${steps}] Turn: ${state.ctx.turn} | Phase: ${state.ctx.phase} | Active: ${JSON.stringify(activePlayers)} | Roll: ${state.G.lastRoll}`);

      let moved = false;
      for (const playerID of activePlayers) {
        const bot = bots[playerID as keyof typeof bots];
        if (!bot) continue;

        const enhancedCtx = { ...state.ctx, coach: CoachPlugin.api({ G: state.G, ctx: state.ctx }) };
        const enhancedState = { ...state, ctx: enhancedCtx };

        const result = await bot.play(enhancedState, playerID) as any;
        if (result && result.action && result.action.payload && result.action.payload.type !== 'noOp') {
          const { action } = result;
          const moveName = 'payload' in action ? action.payload.type : action.move;
          const args = 'payload' in action ? action.payload.args : action.args || [];

          console.log(`  > Bot ${playerID} chose: ${moveName}`, args);

          const client = playerID === '0' ? client0 : client1;
          if (moveName && client.moves[moveName]) {
            client.moves[moveName](...args);
            moved = true;
            break;
          } else {
            console.error(`  > ERROR: Bot ${playerID} tried invalid move: ${moveName}`);
          }
        } else {
           console.log(`  > Bot ${playerID} passed.`);
        }
      }

      if (!moved) {
        console.log(`No active bot made a move. Breaking simulation.`);
        break;
      }
      steps++;
    }

    expect(steps).toBeGreaterThan(0);
    console.log('--- END SIMULATION ---');
  }, 10000); // 10s timeout for simulation
});
