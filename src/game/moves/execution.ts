import type { GameState, GameContext, GameRandom, BotMove } from '../core/types';
import { PHASES } from '../core/constants';
import { checkTerminalResult, advanceCatanTurn } from '../rules/lifecycle';
import { buildRoad, buildSettlement, buildCity, endTurn } from './build';
import { placeSettlement, placeRoad, regenerateBoard } from './setup';
import { tradeBank } from './trade';
import { rollDice, resolveRoll } from './roll';
import { dismissRobber } from './robber';

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

  switch (action.move) {
    case 'buildRoad':
      buildRoad(moveContext, ...action.args);
      break;
    case 'buildSettlement':
      buildSettlement(moveContext, ...action.args);
      break;
    case 'buildCity':
      buildCity(moveContext, ...action.args);
      break;
    case 'tradeBank':
      tradeBank(moveContext, ...action.args);
      break;
    case 'endTurn':
      endTurn(moveContext, ...action.args);
      break;
    case 'placeSettlement':
      placeSettlement(moveContext, ...action.args);
      break;
    case 'placeRoad':
      placeRoad(moveContext, ...action.args);
      break;
    case 'regenerateBoard':
      regenerateBoard(moveContext, ...action.args);
      break;
    case 'rollDice':
      rollDice(moveContext, ...action.args);
      break;
    case 'resolveRoll':
      resolveRoll(moveContext, ...action.args);
      break;
    case 'dismissRobber':
      dismissRobber(moveContext, ...action.args);
      break;
    case 'buyDevCard':
      throw new Error('buyDevCard is not supported yet');
    default: {
      const _exhaustiveCheck: never = action;
      throw new Error(`Unhandled move type: ${(_exhaustiveCheck as BotMove).move}`);
    }
  }

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
