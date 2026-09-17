import type { BotMove } from './src/game/core/types';
import { buildRoad, buildSettlement, buildCity } from './src/game/moves/build';

function dispatchBuildMove(moveContext: any, action: BotMove): boolean {
  switch (action.move) {
    case 'buildRoad': buildRoad(moveContext, ...action.args); return true;
    case 'buildSettlement': buildSettlement(moveContext, ...action.args); return true;
    case 'buildCity': buildCity(moveContext, ...action.args); return true;
  }
  return false;
}
