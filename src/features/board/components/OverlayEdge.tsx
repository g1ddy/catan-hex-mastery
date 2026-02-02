import React from 'react';
import { CoachRecommendation } from '../../../game/analysis/coach';

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
    recommendation?: {
        heatmapColor: string;
        isTop2: boolean;
        data: CoachRecommendation;
    };
}

export const OverlayEdge = React.memo(({
    cx, cy, angle, isOccupied, ownerColor,
    isClickable, isGhost, onClick, recommendation
}: OverlayEdgeProps) => {

    return (
         <g onClick={(e) => {
            e.stopPropagation();
            if (isClickable) onClick();
        }}
        data-tooltip-id={recommendation ? "coach-tooltip" : undefined}
        data-tooltip-content={recommendation ? recommendation.data.vertexId : undefined}
        >
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
                    fill={recommendation ? recommendation.heatmapColor : "white"}
                    opacity={recommendation ? 0.8 : 0.5}
                    transform={`rotate(${angle} ${cx} ${cy})`}
                    data-testid="ghost-edge"
                />
            )}
            {isGhost && recommendation?.isTop2 && (
                 <rect
                    x={cx - 3.5} y={cy - 1.5}
                    width={7} height={3}
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth={0.5}
                    transform={`rotate(${angle} ${cx} ${cy})`}
                    style={{ filter: 'drop-shadow(0 0 1px gold)' }}
                 />
            )}
        </g>
    );
});

OverlayEdge.displayName = 'OverlayEdge';
