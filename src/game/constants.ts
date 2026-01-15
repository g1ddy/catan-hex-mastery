export const PHASES = {
  SETUP: 'setup',
  GAMEPLAY: 'gameplay',
  GAME_OVER: 'gameOver',
} as const;

export const STAGES = {
  ROLLING: 'rolling',
  ACTING: 'acting',
  // Setup stages
  PLACE_SETTLEMENT: 'placeSettlement',
  PLACE_ROAD: 'placeRoad',
  // Future stages
  TRADING: 'trading',
} as const;

export const STAGE_MOVES = {
    [STAGES.ROLLING]: ['rollDice'],
    [STAGES.ACTING]: ['buildRoad', 'buildSettlement', 'buildCity', 'tradeBank', 'endTurn'],
    [STAGES.PLACE_SETTLEMENT]: ['placeSettlement', 'regenerateBoard'],
    [STAGES.PLACE_ROAD]: ['placeRoad'],
} as const;

export const ROLL_ANIMATION_DURATION = 1000;
export const ROLL_RESULT_DISPLAY_DURATION = 4000;
