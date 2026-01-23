import React from 'react';
import { Home, Castle } from 'lucide-react';

const SETTLEMENT_ICON_SIZE = 5;
const CITY_ICON_SIZE = 6;

interface BuildingIconProps {
    vertex: { type: 'settlement' | 'city'; owner: string };
    corner: { x: number; y: number };
    ownerColor: string | null | undefined;
}

export const BuildingIcon: React.FC<BuildingIconProps> = ({ vertex, corner, ownerColor }) => {
    const isSettlement = vertex.type === 'settlement';
    const Icon = isSettlement ? Home : Castle;
    const size = isSettlement ? SETTLEMENT_ICON_SIZE : CITY_ICON_SIZE;
    const typeName = isSettlement ? 'settlement' : 'city';

    return (
        <Icon
            x={corner.x - size / 2}
            y={corner.y - size / 2}
            width={size}
            height={size}
            fill={ownerColor || 'none'}
            stroke="black"
            strokeWidth={1}
            data-testid={`${typeName}-icon`}
            aria-label={`${typeName.charAt(0).toUpperCase() + typeName.slice(1)} owned by Player ${Number(vertex.owner) + 1}`}
            role="img"
        />
    );
};
