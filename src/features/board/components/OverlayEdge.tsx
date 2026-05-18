import React from 'react';

export interface OverlayEdgeProps {
    eId: string;
    cx: number;
    cy: number;
    angle: number;
    // State
    isOccupied: boolean;
    ownerColor?: string | null;
    // Interaction
    isClickable: boolean;
    isGhost: boolean;
    onClick: (eId: string) => void;
    // Recommendations
    isRecommended?: boolean;
    heatmapColor?: string;
    tooltip?: string;
}

export function getOverlayEdgeStyles(
    isRecommended?: boolean,
    heatmapColor?: string,
    tooltip?: string,
    isClickable?: boolean
) {
    const ghostFill = isRecommended ? '#FFD700' : (heatmapColor || 'white');
    const ghostOpacity = isRecommended ? 0.8 : (heatmapColor ? 0.6 : 0.5);
    const hasRecommendation = isRecommended || !!heatmapColor;
    const tooltipId = hasRecommendation ? "coach-tooltip" : (tooltip ? "ui-tooltip" : undefined);
    const cursor = isClickable ? 'pointer' : 'default';

    return { ghostFill, ghostOpacity, tooltipId, cursor };
}

export const OverlayEdge = React.memo(({
    eId, cx, cy, angle, isOccupied, ownerColor,
    isClickable, isGhost, onClick,
    isRecommended, heatmapColor, tooltip
}: OverlayEdgeProps) => {

    const { ghostFill, ghostOpacity, tooltipId, cursor } = getOverlayEdgeStyles(isRecommended, heatmapColor, tooltip, isClickable);

    return (
         <g onClick={(e) => {
            e.stopPropagation();
            if (isClickable) onClick(eId);
        }}
        data-tooltip-id={tooltipId}
        data-tooltip-content={tooltip}
        >
            <circle cx={cx} cy={cy} r={2.5} fill="transparent" style={{ cursor }} />
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
                    fill={ghostFill} opacity={ghostOpacity}
                    transform={`rotate(${angle} ${cx} ${cy})`}
                    data-testid="ghost-edge"
                />
            )}
        </g>
    );
});

OverlayEdge.displayName = 'OverlayEdge';
