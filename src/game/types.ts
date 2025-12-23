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

export interface GameState {
  board: BoardState;
  players: Record<string, Player>;
  setupPhase: SetupPhaseState;
  lastPlacedSettlement: string | null;
  setupOrder: string[]; // Add this
}
