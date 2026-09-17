import type { GameState, GameContext, GameRandom, BotMove } from '../core/types';
import { PHASES } from '../core/constants';
import { checkTerminalResult, advanceCatanTurn } from '../rules/lifecycle';
import { buildRoad, buildSettlement, buildCity, endTurn } from './build';
import { placeSettlement, placeRoad, regenerateBoard } from './setup';
import { tradeBank } from './trade';
import { rollDice, resolveRoll } from './roll';
import { dismissRobber } from './robber';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function executeBuildMove(moveContext: any, action: BotMove): boolean {
  switch (action.move) {
    case 'buildRoad':
      buildRoad(moveContext, ...action.args);
      return true;
    case 'buildSettlement':
      buildSettlement(moveContext, ...action.args);
      return true;
    case 'buildCity':
      buildCity(moveContext, ...action.args);
      return true;
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function executeSetupMove(moveContext: any, action: BotMove): boolean {
  switch (action.move) {
    case 'placeSettlement':
      placeSettlement(moveContext, ...action.args);
      return true;
    case 'placeRoad':
      placeRoad(moveContext, ...action.args);
      return true;
    case 'regenerateBoard':
      regenerateBoard(moveContext, ...action.args);
      return true;
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function executeMiscMove(moveContext: any, action: BotMove): boolean {
  switch (action.move) {
    case 'tradeBank':
      tradeBank(moveContext, ...action.args);
      return true;
    case 'endTurn':
      endTurn(moveContext, ...action.args);
      return true;
    case 'rollDice':
      rollDice(moveContext, ...action.args);
      return true;
    case 'resolveRoll':
      resolveRoll(moveContext, ...action.args);
      return true;
    case 'dismissRobber':
      dismissRobber(moveContext, ...action.args);
      return true;
    case 'buyDevCard':
      throw new Error('buyDevCard is not supported yet');
  }
  return false;
}

function handleNextActiveStages(nextContext: GameContext, nextActiveStages: Partial<Record<string, string>>) {
  type StageType = GameContext['stagesByPlayer'] extends Partial<Record<string, infer S>> ? S : never;

  // Initialize if undefined to allow merging
  if (!nextContext.stagesByPlayer) {
    nextContext.stagesByPlayer = {};
  }

  for (const [key, stage] of Object.entries(nextActiveStages)) {
    if (stage) {
      if (key === 'currentPlayer') {
        nextContext.stagesByPlayer[nextContext.currentPlayer] = stage as StageType;
      } else {
        // eslint-disable-next-line security/detect-object-injection -- Player IDs from events are safe
        nextContext.stagesByPlayer[key] = stage as StageType;
      }
    }
  }
}

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
  let nextActiveStages: Partial<Record<string, string>> | undefined;

  const moveContext = {
    G: nextGame,
    ctx: nextContext,
    events: {
      endTurn: () => {
        endTurnCalled = true;
      },
      setActivePlayers: (stages: Partial<Record<string, string>>) => {
        nextActiveStages = stages;
      },
    },
    random,
  };

  const handled = executeBuildMove(moveContext, action) ||
                  executeSetupMove(moveContext, action) ||
                  executeMiscMove(moveContext, action);

  if (!handled) {
    throw new Error(`Unhandled move type: ${(action as any).move}`);
  }

  if (nextActiveStages) {
    handleNextActiveStages(nextContext, nextActiveStages);
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
