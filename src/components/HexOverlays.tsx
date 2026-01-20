import React, { useMemo } from 'react';
import { Hexagon } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Hex } from '../game/types';
import { HEX_CORNERS, getHexGeometry } from '../game/staticGeometry';
import { BuildMode, UiMode } from './GameControls';
import { getHeatmapColor, CoachRecommendation } from '../game/analysis/coach';
import { safeMove } from '../utils/moveUtils';
import { PHASES, STAGES } from '../game/constants';
import { useBoardInteractions } from '../hooks/useBoardInteractions';
import { OverlayVertex } from './board/OverlayVertex';
import { OverlayEdge } from './board/OverlayEdge';
import { Port } from './board/Port';

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
}

// Custom memoization to prevent re-renders when board state changes unnecessarily
function arePropsEqual(prev: HexOverlaysProps, next: HexOverlaysProps) {
    if (prev.buildMode !== next.buildMode ||
        prev.uiMode !== next.uiMode ||
        prev.showResourceHeatmap !== next.showResourceHeatmap ||
        prev.coachData !== next.coachData ||
        prev.ctx.phase !== next.ctx.phase ||
        prev.ctx.currentPlayer !== next.ctx.currentPlayer ||
        prev.ctx.activePlayers?.[prev.ctx.currentPlayer] !== next.ctx.activePlayers?.[next.ctx.currentPlayer]) {
        return false;
    }

    // This is the key: only re-render if the relevant parts of the board have changed for this hex
    const { vertices: prevV, edges: prevE } = getHexGeometry(prev.hex);
    const { vertices: nextV, edges: nextE } = getHexGeometry(next.hex);

    for (const v of prevV) {
        if (prev.G.board.vertices.get(v.id) !== next.G.board.vertices.get(v.id)) return false;
    }
    for (const e of prevE) {
        if (prev.G.board.edges.get(e.id) !== next.G.board.edges.get(e.id)) return false;
        if (prev.G.board.ports.get(e.id) !== next.G.board.ports.get(e.id)) return false;
    }

    return true;
}

export const HexOverlays = React.memo(({
    hex, G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, showResourceHeatmap, coachData
}: HexOverlaysProps) => {
    const { recommendations, minScore, maxScore, top3Set } = coachData;
    const { vertices, edges, currentHexIdStr } = useMemo(() => getHexGeometry(hex), [hex]);
    const { validSettlements, validCities, validRoads } = useBoardInteractions(G, ctx, ctx.currentPlayer);

    const getPrimaryHexOwner = (parts: string[]): string => {
        return parts.find(ownerId => G.board.hexes.has(ownerId)) || parts[0];
    };

    return (
        <Hexagon q={hex.coords.q} r={hex.coords.r} s={hex.coords.s} cellStyle={{ fill: 'none', stroke: 'none' }}>
            {vertices.map((vData) => {
                const { id: vId, parts } = vData;
                if (getPrimaryHexOwner(parts) !== currentHexIdStr) return null;

                const vertex = G.board.vertices.get(vId);
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
                    const rec = recommendations[vId];
                    if (rec) {
                        recommendationData = rec;
                        heatmapColor = getHeatmapColor(rec.score, minScore, maxScore);
                        isTop3 = top3Set.has(vId);
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

                const edge = G.board.edges.get(eId);
                const ownerColor = edge ? G.players[edge.owner]?.color : null;
                const port = G.board.ports.get(eId);

                let portElement = null;
                if (port) {
                    const portOwner = port.vertices.map(vId => G.board.vertices.get(vId)?.owner).find(Boolean);
                    portElement = (
                        <Port key={`port-${eId}`} cx={midX} cy={midY} angle={angle} type={port.type}
                              ownerColor={portOwner ? G.players[portOwner]?.color : null} />
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
