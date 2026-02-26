import React, { useRef, useCallback } from 'react';
import { BoardProps } from 'boardgame.io/react';
import { GameState, ClientMoves } from '../../../game/core/types';
import { BuildMode, UiMode } from '../../shared/types';
import { safeMove } from '../../shared/utils/feedback';
import { safeGet } from '../../../game/core/utils/objectUtils';
import { PHASES, STAGES } from '../../../game/core/constants';
import { HEX_EDGE_GEOMETRY } from '../../../game/geometry/staticGeometry';
import { OverlayEdge } from './OverlayEdge';
import { Port } from './Port';
import { getPrimaryHexOwner } from './helpers';
import { CoachData } from './HexOverlays';
import { getHeatmapColor } from '../../../game/analysis/coach';

interface HexEdgesProps {
    edges: { id: string; parts: string[]; x: number; y: number }[];
    G: GameState;
    ctx: BoardProps<GameState>['ctx'];
    moves: ClientMoves;
    buildMode: BuildMode;
    setBuildMode: (mode: BuildMode) => void;
    uiMode: UiMode;
    setUiMode: (mode: UiMode) => void;
    validRoads: Set<string>;
    highlightedPortEdgeId?: string;
    currentHexIdStr: string;
    coachData?: CoachData;
}

export const HexEdges: React.FC<HexEdgesProps> = ({
    edges, G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode,
    validRoads, highlightedPortEdgeId, currentHexIdStr, coachData
}) => {
    // Stable handler setup
    const stateRef = useRef({ G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, validRoads });
    stateRef.current = { G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, validRoads };

    const handleEdgeClick = useCallback((eId: string) => {
        const { ctx, moves, setBuildMode, setUiMode } = stateRef.current;
        const isSetup = ctx.phase === PHASES.SETUP;

        const move = isSetup ? moves.placeRoad : moves.buildRoad;
        safeMove(() => move(eId));

        if (isSetup) {
            setUiMode('viewing');
        } else {
            setBuildMode(null);
        }
    }, []);

    return (
        <>
            {edges.map((eData, i) => {
                const { id: eId, parts } = eData;
                if (getPrimaryHexOwner(parts, G) !== currentHexIdStr) return null;

                // Use pre-calculated geometry for performance
                const { x: midX, y: midY, angle } = HEX_EDGE_GEOMETRY[i];

                const edge = safeGet(G.board.edges, eId);
                const ownerColor = edge ? G.players[edge.owner]?.color : null;
                const port = safeGet(G.board.ports, eId);

                let portElement = null;
                if (port) {
                    const portOwner = port.vertices.map(vId => safeGet(G.board.vertices, vId)?.owner).find(Boolean);
                    portElement = (
                        <Port key={`port-${eId}`} cx={midX} cy={midY} angle={angle} type={port.type}
                              ownerColor={portOwner ? G.players[portOwner]?.color : null}
                              isActive={eId === highlightedPortEdgeId} />
                    );
                }

                const isSetup = ctx.phase === PHASES.SETUP;
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];
                const isActingStage = ctx.phase === PHASES.GAMEPLAY && currentStage === STAGES.ACTING;

                let isClickable = false;
                let isGhost = false;
                let isRecommended = false;
                let heatmapColor: string | undefined;
                let tooltip: string | undefined;

                if ((isSetup && currentStage === STAGES.PLACE_ROAD && uiMode === 'placing') ||
                    (isActingStage && buildMode === 'road')) {
                    if (validRoads.has(eId)) {
                        isClickable = true;
                        isGhost = true;

                        if (coachData) {
                            const rec = coachData.recommendations.get(eId);
                            if (rec) {
                                isRecommended = coachData.top3Set.has(eId);
                                heatmapColor = getHeatmapColor(rec.score, coachData.minScore, coachData.maxScore);
                                tooltip = eId;
                            }
                        }
                    }
                }

                return (
                    <React.Fragment key={eId}>
                        <OverlayEdge eId={eId} cx={midX} cy={midY} angle={angle} isOccupied={!!edge}
                                     ownerColor={ownerColor} isClickable={isClickable}
                                     isGhost={isGhost} onClick={handleEdgeClick}
                                     isRecommended={isRecommended}
                                     heatmapColor={heatmapColor}
                                     tooltip={tooltip} />
                        {portElement}
                    </React.Fragment>
                );
            })}
        </>
    );
};
