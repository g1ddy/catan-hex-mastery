import React from 'react';
import { PortType } from '../../game/types';

interface PortProps {
    cx: number;
    cy: number;
    angle: number; // Angle of the edge (unused for now, maybe for rotation later)
    type: PortType;
    ownerColor: string | null;
}

const RESOURCE_LABELS: Record<string, string> = {
    'wood': '🌲',
    'brick': '🧱',
    'sheep': '🐑',
    'wheat': '🌾',
    'ore': '🗻',
    '3:1': '?'
};

const RESOURCE_TEXT: Record<string, string> = {
    'wood': 'W',
    'brick': 'B',
    'sheep': 'S',
    'wheat': 'Wh',
    'ore': 'O',
    '3:1': '3:1'
};

const PORT_COLORS: Record<string, string> = {
    'wood': '#228B22',
    'brick': '#CD5C5C',
    'sheep': '#90EE90',
    'wheat': '#FFD700',
    'ore': '#A9A9A9',
    '3:1': '#F0F8FF'
};

export const Port: React.FC<PortProps> = ({ cx, cy, type, ownerColor }) => {
    // Position port slightly outside the edge
    // Since (cx, cy) is relative to hex center (0,0), we can just scale the vector.
    const dist = Math.sqrt(cx*cx + cy*cy);
    // Avoid division by zero, though unlikely for edge midpoint
    if (dist < 0.1) return null;

    // Hex size is roughly 8. Edge is at ~7.
    // We want port at maybe 10-11.
    // So push out by ~3-4 units.
    const scale = (dist + 3.5) / dist;
    const px = cx * scale;
    const py = cy * scale;

    const label = RESOURCE_LABELS[type] || RESOURCE_TEXT[type] || type;
    const baseColor = PORT_COLORS[type] || 'white';

    // If owned, show owner color ring. If not, thin grey ring.
    const strokeColor = ownerColor || '#666';
    const strokeWidth = ownerColor ? 0.8 : 0.3;

    return (
        <g transform={`translate(${px}, ${py})`}>
             {/* Dashed line to edge? */}
             <line x1={0} y1={0} x2={cx - px} y2={cy - py} stroke={strokeColor} strokeWidth={0.3} strokeDasharray="1,1" />

            {/* Port Circle */}
            <circle
                r={2.5}
                fill={baseColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />

            {/* Label */}
            <text
                textAnchor="middle"
                dy=".35em"
                fontSize={type === '3:1' ? "1.8" : "2.5"}
                fill="black"
                style={{ pointerEvents: 'none', fontWeight: 'bold' }}
            >
                {type === '3:1' ? '3:1' : label}
            </text>
        </g>
    );
};
