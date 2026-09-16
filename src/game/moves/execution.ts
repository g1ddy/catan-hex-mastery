import type { GameState, GameContext, GameRandom, BotMove, MoveHandler } from '../core/types';
import { PHASES } from '../core/constants';
import { checkTerminalResult, advanceCatanTurn } from '../rules/lifecycle';
import { buildRoad, buildSettlement, buildCity, endTurn } from './build';
import { placeSettlement, placeRoad, regenerateBoard } from './setup';
import { tradeBank } from './trade';
import { rollDice, resolveRoll } from './roll';
import { dismissRobber } from './robber';

// Registry of Catan move handlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MOVE_HANDLERS: Record<string, MoveHandler<any[]>> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildRoad: buildRoad as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildSettlement: buildSettlement as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildCity: buildCity as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tradeBank: tradeBank as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  endTurn: endTurn as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  placeSettlement: placeSettlement as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  placeRoad: placeRoad as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  regenerateBoard: regenerateBoard as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rollDice: rollDice as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveRoll: resolveRoll as MoveHandler<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dismissRobber: dismissRobber as MoveHandler<any[]>,
};

/**
 * Authoritative framework-neutral move execution and lifecycle transition seam.
 * Executed by Catan search adapter and runtime move transitions.
 */
export function executeCatanMove(
  G: GameState,
  ctx: GameContext,
  action: BotMove,
  random: GameRandom
): { G: GameState; ctx: GameContext } {
  const nextGame: GameState = JSON.parse(JSON.stringify(G));
  const nextContext: GameContext = JSON.parse(JSON.stringify(ctx));

  const handler = MOVE_HANDLERS[action.move];
  if (!handler) {
    throw new Error(`Unknown move handler for move: ${action.move}`);
  }

  let endTurnCalled = false;
  let nextActiveStage: string | undefined;

  const moveContext = {
    G: nextGame,
    ctx: nextContext,
    events: {
      endTurn: () => {
        endTurnCalled = true;
      },
      setActivePlayers: (stages: Partial<Record<string, string>>) => {
        if (stages.currentPlayer) {
          nextActiveStage = stages.currentPlayer;
        }
      },
    },
    random,
  };

  const args = action.args || [];
  handler(moveContext, ...args);

  if (nextActiveStage) {
    nextContext.stagesByPlayer = {
      [nextContext.currentPlayer]: nextActiveStage as GameContext['stagesByPlayer'] extends Partial<Record<string, infer S>> ? S : never
    };
  }

  if (endTurnCalled) {
    advanceCatanTurn(nextGame, nextContext);
  }

  const terminal = checkTerminalResult(nextGame, nextContext);
  if (terminal) {
    nextContext.gameover = terminal;
    nextContext.phase = PHASES.GAME_OVER;
  }

  return { G: nextGame, ctx: nextContext };
}
