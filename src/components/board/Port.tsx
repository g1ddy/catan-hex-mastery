import React from 'react';
import { CircleHelp } from 'lucide-react';
import { PortType, TerrainType } from '../../game/core/types';
import { RESOURCE_META, TERRAIN_COLORS, PORT_HIGHLIGHT_RADIUS, PORT_HIGHLIGHT_COLOR, PORT_HIGHLIGHT_WIDTH } from '../uiConfig';

interface PortProps {
    cx: number;
    cy: number;
    angle: number; // Angle of the edge (unused for now, maybe for rotation later)
    type: PortType;
    ownerColor: string | null;
    isActive?: boolean;
}

// Map PortType (Resource) to TerrainType to reuse colors
const RESOURCE_TO_TERRAIN: Partial<Record<PortType, TerrainType>> = {
    'wood': TerrainType.Forest,
    'brick': TerrainType.Hills,
    'sheep': TerrainType.Pasture,
    'wheat': TerrainType.Fields,
    'ore': TerrainType.Mountains,
};

export const Port: React.FC<PortProps> = ({ cx, cy, type, ownerColor, isActive }) => {
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

    const meta = RESOURCE_META.find(m => m.name === type);

    // Reuse terrain colors for resources, fallback for 3:1
    const color = (type === '3:1')
        ? '#F0F8FF'
        : (RESOURCE_TO_TERRAIN[type] ? TERRAIN_COLORS[RESOURCE_TO_TERRAIN[type]!] : '#CCCCCC');

    const Icon = meta ? meta.Icon : (type === '3:1' ? CircleHelp : null);

    return (
        <g transform={`translate(${px}, ${py})`}>
            {/* Active Glow/Ring */}
            {isActive && (
                <circle
                    r={PORT_HIGHLIGHT_RADIUS}
                    fill="none"
                    stroke={PORT_HIGHLIGHT_COLOR}
                    strokeWidth={PORT_HIGHLIGHT_WIDTH}
                    className="animate-pulse"
                />
            )}

            {/* Port Background Circle */}
            <circle
                r={2.5}
                fill={color}
                stroke={ownerColor || "#666"}
                strokeWidth={ownerColor ? 0.8 : 0.3}
                className="drop-shadow-sm"
            />

            {/* Port Icon or Text */}
            {Icon ? (
                <Icon
                    x={-1.5}
                    y={-1.5}
                    width={3}
                    height={3}
                    color="#000"
                    opacity={0.7}
                />
            ) : (
                <text
                    y={0.8}
                    textAnchor="middle"
                    fontSize={1.5}
                    fill="#333"
                    fontWeight="bold"
                >
                    ?
                </text>
            )}

            {/* If it's a 3:1 port, we might want to show "3:1" text specifically instead of a generic icon?
                The previous code used '?', which CircleHelp matches.
                Standard Catan often puts "3:1".
                Let's stick to the Icon approach for consistency unless 3:1 text is preferred.
                But the user asked for icons.
            */}
        </g>
    );
};
