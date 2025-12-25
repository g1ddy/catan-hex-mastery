import React from 'react';
// @ts-ignore
import { Hexagon } from 'react-hexgrid';
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

export const GameHex: React.FC<GameHexProps> = ({ hex, onClick }) => {
  const color = TERRAIN_COLORS[hex.terrain];
  const isRed = hex.tokenValue === 6 || hex.tokenValue === 8;
  const textColorClass = isRed ? 'text-red-600' : 'text-black';
  const pips = getPipsCount(hex.tokenValue || 0);

  return (
    <Hexagon
      q={hex.coords.q}
      r={hex.coords.r}
      s={hex.coords.s}
      onClick={() => onClick(hex)}
      cellStyle={{ fill: color, stroke: 'white', strokeWidth: '0.2' }}
    >
       {hex.tokenValue && (
           <foreignObject x="-4" y="-4" width="8" height="8">
               <div
                   className="w-full h-full rounded-full bg-[#F5F5DC] shadow-md flex flex-col items-center justify-center border border-gray-300"
                   style={{ fontSize: '0.2rem' }}
               >
                   <span className={`font-bold leading-none ${textColorClass}`} style={{ fontSize: '0.35rem' }}>
                       {hex.tokenValue}
                   </span>
                   <div className={`flex gap-[0.5px] leading-none ${textColorClass}`} style={{ fontSize: '0.25rem', marginTop: '0.5px' }}>
                       {Array.from({ length: pips }).map((_, i) => (
                           <span key={i}>•</span>
                       ))}
                   </div>
               </div>
           </foreignObject>
       )}
    </Hexagon>
  );
};
