import React from 'react';

interface NumberTokenProps {
  value: number;
  pips: number;
}

export const NumberToken: React.FC<NumberTokenProps> = ({ value, pips }) => {
  const isRed = value === 6 || value === 8;
  const color = isRed ? '#dc2626' : '#111827'; // red-600 : gray-900

  // Configuration for geometry (SVG units)
  // Assuming the previous width="8" meant the token is 8 units wide.
  const radius = 3.8;
  const pipRadius = 0.25;
  const pipGap = 0.3; // slightly tighter than 0.5 to keep them together
  const pipY = 2.2;   // Position pips below the number
  const fontSize = 3;

  // Calculate total width of pips to center them
  const totalPipWidth = (pips * (pipRadius * 2)) + ((pips - 1) * pipGap);
  const startX = -(totalPipWidth / 2) + pipRadius;

  return (
    <g>
      {/* Token Background */}
      <circle
        cx="0"
        cy="0"
        r={radius}
        fill="#f3e5ab"
        stroke="#6b7280"
        strokeOpacity="0.5"
        strokeWidth="0.2"
      />

      {/* Number Value */}
      <text
        x="0"
        y="1" // Vertically aligned - slightly down to visually center with pips below
        textAnchor="middle"
        fill={color}
        fontSize={fontSize}
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
            cx={startX + i * (pipRadius * 2 + pipGap)}
            cy={pipY}
            r={pipRadius}
            fill={color}
          />
        ))}
      </g>
    </g>
  );
};
