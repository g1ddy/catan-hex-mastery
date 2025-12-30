import React from 'react';

interface NumberTokenProps {
  value: number;
  pips: number;
}

const TOKEN_COLORS = {
  RED: '#dc2626', // red-600
  DEFAULT: '#111827', // gray-900
  BACKGROUND: '#f3e5ab',
  STROKE: '#6b7280',
};

const GEOMETRY = {
  RADIUS: 3.8,
  PIP_RADIUS: 0.25,
  PIP_GAP: 0.3, // slightly tighter than 0.5 to keep them together
  PIP_Y: 2.2,   // Position pips below the number
  FONT_SIZE: 3,
  NUMBER_Y: 1,
  STROKE_WIDTH: 0.2,
};

export const NumberToken: React.FC<NumberTokenProps> = ({ value, pips }) => {
  const isRed = value === 6 || value === 8;
  const color = isRed ? TOKEN_COLORS.RED : TOKEN_COLORS.DEFAULT;

  // Calculate total width of pips to center them
  const totalPipWidth = (pips * (GEOMETRY.PIP_RADIUS * 2)) + ((pips - 1) * GEOMETRY.PIP_GAP);
  const startX = -(totalPipWidth / 2) + GEOMETRY.PIP_RADIUS;

  return (
    <g>
      {/* Token Background */}
      <circle
        cx="0"
        cy="0"
        r={GEOMETRY.RADIUS}
        fill={TOKEN_COLORS.BACKGROUND}
        stroke={TOKEN_COLORS.STROKE}
        strokeOpacity="0.5"
        strokeWidth={GEOMETRY.STROKE_WIDTH}
      />

      {/* Number Value */}
      <text
        x="0"
        y={GEOMETRY.NUMBER_Y} // Vertically aligned
        textAnchor="middle"
        fill={color}
        fontSize={GEOMETRY.FONT_SIZE}
        fontWeight="bold"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {value}
      </text>

      {/* Pips */}
      <g>
        {Array.from({ length: pips }).map((_, i) => (
          <circle
            key={i}
            cx={startX + i * (GEOMETRY.PIP_RADIUS * 2 + GEOMETRY.PIP_GAP)}
            cy={GEOMETRY.PIP_Y}
            r={GEOMETRY.PIP_RADIUS}
            fill={color}
          />
        ))}
      </g>
    </g>
  );
};
