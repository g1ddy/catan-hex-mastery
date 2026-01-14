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

export type RollStatus = 'IDLE' | 'ROLLING' | 'RESOLVED';

export interface GameState {
  board: BoardState;
  players: Record<string, Player>;
  setupPhase: SetupPhaseState;
  setupOrder: string[];
  lastRoll: [number, number];
  lastRollRewards: Record<string, Partial<Resources>>; // PlayerID -> Resources Gained
  boardStats: BoardStats;
  hasRolled: boolean;
  rollStatus: RollStatus;
}

// Legacy format: { move: 'name', args: [] }
export interface BotMove {
  move: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any[];
}

// Redux-style action format: { type: 'MAKE_MOVE', payload: { type: 'name', args: [] } }
export interface MakeMoveAction {
  type: 'MAKE_MOVE';
  payload: {
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any[];
    playerID: string;
    credentials?: string;
  };
}

// Union type to handle both formats
export type GameAction = BotMove | MakeMoveAction;
