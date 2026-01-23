import React, { useMemo } from 'react';
import { Hexagon } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Hex } from '../../../game/core/types';
import { HEX_CORNERS, getHexGeometry } from '../../../game/geometry/staticGeometry';
import { BuildMode, UiMode } from '../../hud/components/GameControls';
import { getHeatmapColor, CoachRecommendation } from '../../../game/analysis/coach';
import { safeMove } from '../../../shared/utils/feedback';
import { safeGet, safeCheck } from '../../../game/core/utils/objectUtils';
import { PHASES, STAGES } from '../../../game/core/constants';
import { useBoardInteractions } from '../hooks/useBoardInteractions';
import { OverlayVertex } from './OverlayVertex';
import { OverlayEdge } from './OverlayEdge';
import { Port } from './Port';

export interface CoachData {
    recommendations: Record<string, CoachRecommendation>;
    minScore: number;
    maxScore: number;
    top3Set: Set<string>;
}

interface HexOverlaysProps {
    hex: Hex;
    G: GameState;
    ctx: BoardProps<GameState>['ctx'];
    moves: BoardProps<GameState>['moves'];
    buildMode: BuildMode;
    setBuildMode: (mode: BuildMode) => void;
    uiMode: UiMode;
    setUiMode: (mode: UiMode) => void;
    showResourceHeatmap: boolean;
    coachData: CoachData;
    highlightedPortEdgeId?: string;
}

// Custom memoization to prevent re-renders when board state changes unnecessarily
function arePropsEqual(prev: HexOverlaysProps, next: HexOverlaysProps) {
    if (prev.buildMode !== next.buildMode ||
        prev.uiMode !== next.uiMode ||
        prev.showResourceHeatmap !== next.showResourceHeatmap ||
        prev.coachData !== next.coachData ||
        prev.highlightedPortEdgeId !== next.highlightedPortEdgeId ||
        prev.ctx.phase !== next.ctx.phase ||
        prev.ctx.currentPlayer !== next.ctx.currentPlayer ||
        prev.ctx.activePlayers?.[prev.ctx.currentPlayer] !== next.ctx.activePlayers?.[next.ctx.currentPlayer]) {
        return false;
    }

    // This is the key: only re-render if the relevant parts of the board have changed for this hex
    const { vertices: prevV, edges: prevE } = getHexGeometry(prev.hex);

    for (const v of prevV) {
        if (safeGet(prev.G.board.vertices, v.id) !== safeGet(next.G.board.vertices, v.id)) return false;
    }
    for (const e of prevE) {
        if (safeGet(prev.G.board.edges, e.id) !== safeGet(next.G.board.edges, e.id)) return false;
        if (safeGet(prev.G.board.ports, e.id) !== safeGet(next.G.board.ports, e.id)) return false;
    }

    return true;
}

export const HexOverlays = React.memo(({
    hex, G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, showResourceHeatmap, coachData, highlightedPortEdgeId
}: HexOverlaysProps) => {
    const { vertices, edges, currentHexIdStr } = useMemo(() => getHexGeometry(hex), [hex]);
    const { validSettlements, validCities, validRoads } = useBoardInteractions(G, ctx, ctx.currentPlayer);

    const getPrimaryHexOwner = (parts: string[]): string => {
        return parts.find(ownerId => safeCheck(G.board.hexes, ownerId)) || parts[0];
    };

    return (
        <Hexagon q={hex.coords.q} r={hex.coords.r} s={hex.coords.s} cellStyle={{ fill: 'none', stroke: 'none' }}>
            {vertices.map((vData) => {
                const { id: vId, parts } = vData;
                if (getPrimaryHexOwner(parts) !== currentHexIdStr) return null;

                const vertex = safeGet(G.board.vertices, vId);
                const ownerColor = vertex ? G.players[vertex.owner]?.color : null;
                const isSetup = ctx.phase === PHASES.SETUP;
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];
                const isActingStage = ctx.phase === PHASES.GAMEPLAY && currentStage === STAGES.ACTING;

                let isClickable = false;
                let isGhost = false;
                let recommendationData: CoachRecommendation | undefined;
                let heatmapColor = "";
                let isTop3 = false;
                let clickAction = () => {};

                const applyCoachRec = () => {
                    const rec = coachData.recommendations[vId];
                    if (rec) {
                        recommendationData = rec;
                        heatmapColor = getHeatmapColor(rec.score, coachData.minScore, coachData.maxScore);
                        isTop3 = coachData.top3Set.has(vId);
                    }
                };

                if (isSetup && currentStage === STAGES.PLACE_SETTLEMENT && uiMode === 'placing' && validSettlements.has(vId)) {
                    isClickable = true;
                    isGhost = true;
                    clickAction = () => safeMove(() => moves.placeSettlement(vId));
                    applyCoachRec();
                } else if (isActingStage) {
                    if (buildMode === 'settlement' && validSettlements.has(vId)) {
                         isClickable = true;
                         isGhost = true;
                         clickAction = () => {
                             safeMove(() => moves.buildSettlement(vId));
                             setBuildMode(null);
                         };
                         applyCoachRec();
                    } else if (buildMode === 'city' && validCities.has(vId)) {
                         isClickable = true;
                         clickAction = () => {
                              safeMove(() => moves.buildCity(vId));
                              setBuildMode(null);
                         };
                         applyCoachRec();
                    }
                }

                return (
                    <OverlayVertex
                        key={vId} vId={vId} cx={vData.x} cy={vData.y} vertex={vertex}
                        ownerColor={ownerColor} isClickable={isClickable} isGhost={isGhost}
                        onClick={clickAction} buildMode={buildMode}
                        recommendation={recommendationData ? { heatmapColor, isTop3, data: recommendationData } : undefined}
                        showResourceHeatmap={showResourceHeatmap}
                    />
                );
            })}

            {edges.map((eData, i) => {
                const { id: eId, parts } = eData;
                if (getPrimaryHexOwner(parts) !== currentHexIdStr) return null;

                const nextCorner = HEX_CORNERS[(i + 1) % 6];
                const midX = (eData.x + nextCorner.x) / 2;
                const midY = (eData.y + nextCorner.y) / 2;
                const angle = Math.atan2(nextCorner.y - eData.y, nextCorner.x - eData.x) * 180 / Math.PI;

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
                let clickAction = () => {};

                if ((isSetup && currentStage === STAGES.PLACE_ROAD && uiMode === 'placing') ||
                    (isActingStage && buildMode === 'road')) {
                    if (validRoads.has(eId)) {
                        isClickable = true;
                        isGhost = true;
                        clickAction = () => {
                            const move = isSetup ? moves.placeRoad : moves.buildRoad;
                            safeMove(() => move(eId));
                            if (isSetup) setUiMode('viewing');
                            else setBuildMode(null);
                        };
                    }
                }

                return (
                    <React.Fragment key={eId}>
                        <OverlayEdge cx={midX} cy={midY} angle={angle} isOccupied={!!edge}
                                     ownerColor={ownerColor} isClickable={isClickable}
                                     isGhost={isGhost} onClick={clickAction} />
                        {portElement}
                    </React.Fragment>
                );
            })}
        </Hexagon>
    );
}, arePropsEqual);
