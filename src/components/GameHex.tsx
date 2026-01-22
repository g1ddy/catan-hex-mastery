import React from 'react';
import { Hexagon } from 'react-hexgrid';
import { Skull } from 'lucide-react';
import { Hex } from '../game/core/types';
import { NumberToken } from './NumberToken';
import { TERRAIN_COLORS } from './uiConfig';

interface GameHexProps {
  hex: Hex;
  onClick: (hex: Hex) => void;
  isProducing?: boolean;
  hasRobber?: boolean;
  isPendingRobber?: boolean;
}

const PIPS_MAP: Record<number, number> = {
  2: 1, 12: 1,
  3: 2, 11: 2,
  4: 3, 10: 3,
  5: 4, 9: 4,
  6: 5, 8: 5
};

const getPipsCount = (num: number): number => {
  return PIPS_MAP[num] || 0;
};

const GameHexComponent: React.FC<GameHexProps> = ({ hex, onClick, isProducing, hasRobber, isPendingRobber }) => {
  const color = TERRAIN_COLORS[hex.terrain];
  const pips = getPipsCount(hex.tokenValue || 0);

  return (
    <g className={isProducing ? 'animate-pulse motion-reduce:animate-none' : ''}>
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
        {(hasRobber || isPendingRobber) && (
            <Skull
                x={-4}
                y={-4}
                width={8}
                height={8}
                className={`text-slate-800 drop-shadow-md ${isPendingRobber ? 'fill-red-500 opacity-80' : 'fill-slate-400'}`}
                strokeWidth={1.5}
            />
        )}
        </Hexagon>
    </g>
  );
};

export const GameHex = React.memo(GameHexComponent);
