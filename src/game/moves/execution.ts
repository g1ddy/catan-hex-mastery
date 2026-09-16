import type { GameState, GameContext, GameRandom, BotMove, MoveContext, MoveArguments } from '../core/types';
import { PHASES } from '../core/constants';
import { checkTerminalResult, advanceCatanTurn } from '../rules/lifecycle';
import { buildRoad, buildSettlement, buildCity, endTurn } from './build';
import { placeSettlement, placeRoad, regenerateBoard } from './setup';
import { tradeBank } from './trade';
import { rollDice, resolveRoll } from './roll';
import { dismissRobber } from './robber';

type SupportedMoveName = keyof MoveArguments;
type MoveHandler = (context: MoveContext, ...args: never[]) => void | GameState | 'INVALID_MOVE';

const MOVE_HANDLERS: Partial<Record<SupportedMoveName, MoveHandler>> = {
  buildRoad: buildRoad as MoveHandler,
  buildSettlement: buildSettlement as MoveHandler,
  buildCity: buildCity as MoveHandler,
  tradeBank: tradeBank as MoveHandler,
  endTurn: endTurn as MoveHandler,
  placeSettlement: placeSettlement as MoveHandler,
  placeRoad: placeRoad as MoveHandler,
  regenerateBoard: regenerateBoard as MoveHandler,
  rollDice: rollDice as MoveHandler,
  resolveRoll: resolveRoll as MoveHandler,
  dismissRobber: dismissRobber as MoveHandler,
};

/**
 * Framework-neutral move execution and lifecycle transition seam for Catan simulation and search.
 * Executes a Catan command (BotMove) against GameState and GameContext without runtime/vendor dependencies.
 */
export function executeCatanMove(
  G: GameState,
  ctx: GameContext,
  action: BotMove,
  random: GameRandom
): { G: GameState; ctx: GameContext } {
  const nextGame: GameState = JSON.parse(JSON.stringify(G));
  const nextContext: GameContext = JSON.parse(JSON.stringify(ctx));

  let endTurnCalled = false;
  let nextActiveStage: string | undefined;

  const moveContext: MoveContext = {
    G: nextGame,
    ctx: nextContext,
    events: {
      endTurn: () => {
        endTurnCalled = true;
      },
      setActivePlayers: (stages) => {
        if (stages.currentPlayer) {
          nextActiveStage = stages.currentPlayer;
        }
      },
    },
    random,
  };

  const handler = MOVE_HANDLERS[action.move];
  if (!handler) {
    throw new Error(`${action.move} is not supported by framework-neutral Catan execution`);
  }

  handler(moveContext, ...(action.args as never[]));

  if (nextActiveStage) {
    nextContext.stagesByPlayer = {
      [nextContext.currentPlayer]: nextActiveStage as GameContext['stagesByPlayer'] extends Partial<Record<string, infer S>> ? S : never,
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
