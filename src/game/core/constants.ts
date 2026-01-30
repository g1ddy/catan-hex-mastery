export const PHASES = {
  SETUP: 'setup',
  GAMEPLAY: 'gameplay',
  GAME_OVER: 'gameOver',
} as const;

export const STAGES = {
  ROLLING: 'rolling',
  ACTING: 'acting',
  ROBBER: 'robber',
  // Setup stages
  PLACE_SETTLEMENT: 'placeSettlement',
  PLACE_ROAD: 'placeRoad',
  // Future stages
  TRADING: 'trading',
} as const;

export const STAGE_MOVES = {
    [STAGES.ROLLING]: ['rollDice', 'resolveRoll', 'noOp'],
    [STAGES.ACTING]: ['buildRoad', 'buildSettlement', 'buildCity', 'tradeBank', 'endTurn', 'noOp'],
    [STAGES.ROBBER]: ['dismissRobber', 'noOp'],
    [STAGES.PLACE_SETTLEMENT]: ['placeSettlement', 'regenerateBoard', 'noOp'],
    [STAGES.PLACE_ROAD]: ['placeRoad', 'noOp'],
} as const;

export const WINNING_SCORE = 10;
