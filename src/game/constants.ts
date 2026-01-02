export const PHASES = {
  SETUP: 'setup',
  GAMEPLAY: 'gameplay',
  TRADE: 'trade',
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
