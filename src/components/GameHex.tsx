import React from 'react';
// @ts-ignore
import { Hexagon, Text } from 'react-hexgrid';
import { Hex, TerrainType } from '../game/types';

interface GameHexProps {
  hex: Hex;
  onClick: (hex: Hex) => void;
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

const getPips = (num: number): string => {
  const map: Record<number, number> = {
      2:1, 12:1,
      3:2, 11:2,
      4:3, 10:3,
      5:4, 9:4,
      6:5, 8:5
  };
  return '•'.repeat(map[num] || 0);
};

export const GameHex: React.FC<GameHexProps> = ({ hex, onClick }) => {
  const color = TERRAIN_COLORS[hex.terrain];
  const isRed = hex.tokenValue === 6 || hex.tokenValue === 8;
  const textColor = isRed ? 'red' : 'black';

  return (
    <Hexagon
      q={hex.coords.q}
      r={hex.coords.r}
      s={hex.coords.s}
      onClick={() => onClick(hex)}
      cellStyle={{ fill: color, stroke: 'white', strokeWidth: '0.2' }}
    >
       {hex.tokenValue && (
           <g>
               <circle r="3" fill="white" fillOpacity="0.7" />
               <Text y="-0.5" className="token-value" style={{ fontSize: '0.2rem', fill: textColor }}>
                   {hex.tokenValue}
               </Text>
               <Text y="2" className="token-pips" style={{ fontSize: '0.2rem', fill: textColor }}>
                   {getPips(hex.tokenValue)}
               </Text>
           </g>
       )}
    </Hexagon>
  );
};
