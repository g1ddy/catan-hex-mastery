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

function getGhostFill(isRecommended: boolean | undefined, heatmapColor: string | undefined): string {
    return isRecommended ? '#FFD700' : (heatmapColor || 'white');
}

function getGhostOpacity(isRecommended: boolean | undefined, heatmapColor: string | undefined): number {
    return isRecommended ? 0.8 : (heatmapColor ? 0.6 : 0.5);
}

function getTooltipId(isRecommended: boolean | undefined, heatmapColor: string | undefined, tooltip: string | undefined): string | undefined {
    const hasRecommendation = isRecommended || !!heatmapColor;
    return hasRecommendation ? "coach-tooltip" : (tooltip ? "ui-tooltip" : undefined);
}

function OverlayEdgeComponent({
    eId, cx, cy, angle, isOccupied, ownerColor,
    isClickable, isGhost, onClick,
    isRecommended, heatmapColor, tooltip
}: OverlayEdgeProps) {

    const ghostFill = getGhostFill(isRecommended, heatmapColor);
    const ghostOpacity = getGhostOpacity(isRecommended, heatmapColor);
    const tooltipId = getTooltipId(isRecommended, heatmapColor, tooltip);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isClickable) onClick(eId);
    };

    return (
         <g onClick={handleClick}
        data-tooltip-id={tooltipId}
        data-tooltip-content={tooltip}
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
                    fill={ghostFill} opacity={ghostOpacity}
                    transform={`rotate(${angle} ${cx} ${cy})`}
                    data-testid="ghost-edge"
                />
            )}
        </g>
    );
}

export const OverlayEdge = React.memo(OverlayEdgeComponent);
OverlayEdge.displayName = 'OverlayEdge';
