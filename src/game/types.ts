export interface CubeCoordinates {
  q: number;
  r: number;
  s: number;
}

export enum TerrainType {
  Forest = 'Forest',
  Hills = 'Hills',
  Pasture = 'Pasture',
  Fields = 'Fields',
  Mountains = 'Mountains',
  Desert = 'Desert',
  Sea = 'Sea'
}

export const TERRAIN_CONFIG: Record<TerrainType, string | null> = {
  [TerrainType.Forest]: 'wood',
  [TerrainType.Hills]: 'brick',
  [TerrainType.Pasture]: 'sheep',
  [TerrainType.Fields]: 'wheat',
  [TerrainType.Mountains]: 'ore',
  [TerrainType.Desert]: null,
  [TerrainType.Sea]: null
};

export interface Hex {
  id: string;
  coords: CubeCoordinates;
  terrain: TerrainType;
  tokenValue: number | null;
}

export interface Resources {
  wood: number;
  brick: number;
  sheep: number;
  wheat: number;
  ore: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  resources: Resources;
  settlements: string[]; // Array of vertex IDs
  roads: string[];      // Array of edge IDs
  victoryPoints: number;
}

export interface SetupPhaseState {
  activeRound: 1 | 2;
}

export interface BoardState {
  hexes: Record<string, Hex>;
  vertices: Record<string, { owner: string; type: 'settlement' | 'city' }>; // owner is player ID
  edges: Record<string, { owner: string }>; // owner is player ID
}

export interface BoardStats {
  totalPips: Record<string, number>; // Resource -> Total Pips
  fairnessScore: number; // 0-100
  warnings: string[];
}

export enum RollStatus {
  IDLE = 'idle',
  ROLLING = 'rolling',
  RESOLVED = 'resolved'
}

export interface GameState {
  board: BoardState;
  players: Record<string, Player>;
  setupPhase: SetupPhaseState;
  setupOrder: string[];
  lastRoll: [number, number];
  lastRollRewards: Record<string, Partial<Resources>>; // PlayerID -> Resources Gained
  boardStats: BoardStats;
  rollStatus: RollStatus;
  robberLocation: string; // Hex ID
}

// Map of Move Names to their Argument Tuples
export interface MoveArguments {
  buildRoad: [string];
  buildSettlement: [string];
  buildCity: [string];
  tradeBank: [];
  rollDice: [];
  endTurn: [];
  placeSettlement: [string];
  placeRoad: [string];
  regenerateBoard: [];
  dismissRobber: [string];
  buyDevCard: []; // Included for forward compatibility/BotCoach references
}

// Strict Discriminated Union for Bot Moves
export type BotMove = {
  [K in keyof MoveArguments]: {
    move: K;
    args: MoveArguments[K];
  }
}[keyof MoveArguments];

// Strict Discriminated Union for Redux-style payloads
export type MakeMovePayload = {
  [K in keyof MoveArguments]: {
    type: K;
    args: MoveArguments[K];
    playerID: string;
    credentials?: string;
  }
}[keyof MoveArguments];

export interface MakeMoveAction {
  type: 'MAKE_MOVE';
  payload: MakeMovePayload;
}

// Union type to handle both formats
export type GameAction = BotMove | MakeMoveAction;
