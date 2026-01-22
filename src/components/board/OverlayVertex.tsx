import React from 'react';
import { BuildingIcon } from './BuildingIcon';
import { CoachRecommendation } from '../../game/analysis/coach';
import { BOARD_CONFIG } from '../../game/core/config';
import { BuildMode } from '../GameControls';

export interface OverlayVertexProps {
    vId: string;
    cx: number;
    cy: number;
    // State
    vertex?: { type: 'settlement' | 'city'; owner: string };
    ownerColor?: string | null;
    // Interaction
    isClickable: boolean;
    isGhost: boolean;
    onClick: () => void;
    buildMode: BuildMode;
    // Coach
    recommendation?: {
        heatmapColor: string;
        isTop3: boolean;
        data: CoachRecommendation;
    };
    showResourceHeatmap: boolean;
}

export const OverlayVertex = React.memo(({
    vId, cx, cy, vertex, ownerColor,
    isClickable, isGhost, onClick, buildMode,
    recommendation, showResourceHeatmap
}: OverlayVertexProps) => {
    const isOccupied = !!vertex;
    const { heatmapColor, isTop3, data: recommendationData } = recommendation || {};

    return (
        <g className="group" onClick={(e) => {
            e.stopPropagation();
            if (isClickable) onClick();
        }}>
            <circle
                cx={cx} cy={cy}
                r={3}
                fill="transparent"
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
                data-testid={isGhost ? "ghost-vertex" : undefined}
            />
            {isOccupied && vertex && (
                <BuildingIcon
                    vertex={vertex}
                    corner={{ x: cx, y: cy }}
                    ownerColor={ownerColor}
                />
            )}

            {isGhost && (
                <circle cx={cx} cy={cy} r={BOARD_CONFIG.GHOST_VERTEX_RADIUS} fill="white" opacity={0.5} className="ghost-vertex" />
            )}

            {isClickable && buildMode === 'city' && (
                 <circle cx={cx} cy={cy} r={4} fill="none" stroke="white" strokeWidth={1} className="animate-pulse motion-reduce:animate-none" />
            )}

            {recommendation && (
                 <g
                    className={`coach-highlight transition-opacity duration-200 ${
                        isTop3 || showResourceHeatmap ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    data-tooltip-id="coach-tooltip"
                    data-tooltip-content={recommendationData ? vId : ""}
                 >
                    <circle
                        cx={cx} cy={cy}
                        r={4}
                        fill={heatmapColor}
                        opacity={0.6}
                        stroke="none"
                    />
                    {isTop3 ? (
                        <circle
                            cx={cx} cy={cy}
                            r={5}
                            fill="none"
                            stroke="#FFD700"
                            strokeWidth={2}
                            className="animate-pulse motion-reduce:animate-none"
                        />
                    ) : (
                        <circle
                            cx={cx} cy={cy}
                            r={4}
                            fill="none"
                            stroke={heatmapColor}
                            strokeWidth={0.5}
                        />
                    )}
                 </g>
            )}
        </g>
    );
});

OverlayVertex.displayName = 'OverlayVertex';
