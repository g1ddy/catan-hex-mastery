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
