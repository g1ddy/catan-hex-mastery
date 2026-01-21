import { Resources, TERRAIN_CONFIG, TerrainType } from './types';

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
    [STAGES.ROLLING]: ['rollDice'],
    [STAGES.ACTING]: ['buildRoad', 'buildSettlement', 'buildCity', 'tradeBank', 'endTurn'],
    [STAGES.ROBBER]: ['dismissRobber'],
    [STAGES.PLACE_SETTLEMENT]: ['placeSettlement', 'regenerateBoard'],
    [STAGES.PLACE_ROAD]: ['placeRoad'],
} as const;

export const WINNING_SCORE = 10;

export const BUILD_COSTS = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, wheat: 1, sheep: 1 },
  city: { wheat: 2, ore: 3 },
  devCard: { ore: 1, wheat: 1, sheep: 1 },
};

export const PIP_MAP: Record<number, number> = {
  2: 1, 12: 1,
  3: 2, 11: 2,
  4: 3, 10: 3,
  5: 4, 9: 4,
  6: 5, 8: 5,
  7: 0
};

export const BANK_TRADE_GIVE_AMOUNT = 4;
export const BANK_TRADE_RECEIVE_AMOUNT = 1;

/**
 * Mapping of TerrainType to Resource string.
 */
export const TERRAIN_TO_RESOURCE: Partial<Record<TerrainType, keyof Resources>> = Object.entries(TERRAIN_CONFIG).reduce((acc, [terrain, resource]) => {
    if (resource) {
        acc[terrain as TerrainType] = resource as keyof Resources;
    }
    return acc;
}, {} as Partial<Record<TerrainType, keyof Resources>>);
