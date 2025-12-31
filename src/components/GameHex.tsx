import React from 'react';
// @ts-expect-error -- `react-hexgrid` lacks type definitions
import { Hexagon } from 'react-hexgrid';
import { Hex, TerrainType } from '../game/types';
import { NumberToken } from './NumberToken';

interface GameHexProps {
  hex: Hex;
  onClick: (hex: Hex) => void;
  isProducing?: boolean;
}

const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.Forest]: '#228B22',
  [TerrainType.Hills]: '#CD5C5C',
  [TerrainType.Pasture]: '#90EE90',
  [TerrainType.Fields]: '#FFD700',
  [TerrainType.Mountains]: '#A9A9A9',
  [TerrainType.Desert]: '#F4A460',
  [TerrainType.Sea]: '#87CEEB'
};

const getPipsCount = (num: number): number => {
  const map: Record<number, number> = {
      2:1, 12:1,
      3:2, 11:2,
      4:3, 10:3,
      5:4, 9:4,
      6:5, 8:5
  };
  return map[num] || 0;
};

export const GameHex: React.FC<GameHexProps> = ({ hex, onClick, isProducing }) => {
  const color = TERRAIN_COLORS[hex.terrain];
  const pips = getPipsCount(hex.tokenValue || 0);

  return (
    <g className={isProducing ? 'animate-pulse' : ''}>
        <Hexagon
        q={hex.coords.q}
        r={hex.coords.r}
        s={hex.coords.s}
        onClick={() => onClick(hex)}
        cellStyle={{
            fill: color,
            stroke: isProducing ? '#FFD700' : 'white',
            strokeWidth: isProducing ? '0.8' : '0.2'
        }}
        >
        {hex.tokenValue && (
            <NumberToken value={hex.tokenValue} pips={pips} />
        )}
        </Hexagon>
    </g>
  );
};
