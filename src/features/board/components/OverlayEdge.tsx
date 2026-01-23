import React from 'react';

export interface OverlayEdgeProps {
    cx: number;
    cy: number;
    angle: number;
    // State
    isOccupied: boolean;
    ownerColor?: string | null;
    // Interaction
    isClickable: boolean;
    isGhost: boolean;
    onClick: () => void;
}

export const OverlayEdge = React.memo(({
    cx, cy, angle, isOccupied, ownerColor,
    isClickable, isGhost, onClick
}: OverlayEdgeProps) => {

    return (
         <g onClick={(e) => {
            e.stopPropagation();
            if (isClickable) onClick();
        }}>
            <circle cx={cx} cy={cy} r={2.5} fill="transparent" style={{ cursor: isClickable ? 'pointer' : 'default' }} />
            {isOccupied && (
                <rect
                    x={cx - 3} y={cy - 1}
                    width={6} height={2}
                    fill={ownerColor || 'none'}
                    transform={`rotate(${angle} ${cx} ${cy})`}
                    data-testid="occupied-edge"
                />
            )}
             {isGhost && (
                <rect
                    x={cx - 3} y={cy - 1}
                    width={6} height={2}
                    fill="white" opacity={0.5}
                    transform={`rotate(${angle} ${cx} ${cy})`}
                    data-testid="ghost-edge"
                />
            )}
        </g>
    );
});

OverlayEdge.displayName = 'OverlayEdge';
