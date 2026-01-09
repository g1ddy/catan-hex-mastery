import React from 'react';
import { Hexagon } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Hex } from '../game/types';
import { getVerticesForHex, getEdgesForHex } from '../game/hexUtils';
import { hexCornerOffset } from '../game/geometry';
import { BOARD_CONFIG } from '../game/config';
import { BuildMode, UiMode } from './GameControls';
import { getHeatmapColor, CoachRecommendation } from '../game/analysis/coach';
import { safeMove } from '../utils/moveUtils';
import { PHASES, STAGES } from '../game/constants';
import { isValidSettlementLocation, isValidSettlementPlacement, isValidCityPlacement, isValidRoadPlacement, isValidSetupRoadPlacement } from '../game/rules/placement';
import { BuildingIcon } from './board/BuildingIcon';

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
    showCoachMode: boolean;
    coachData: CoachData;
}

function arePropsEqual(prev: HexOverlaysProps, next: HexOverlaysProps) {
    if (prev.buildMode !== next.buildMode) return false;
    if (prev.uiMode !== next.uiMode) return false;
    if (prev.showCoachMode !== next.showCoachMode) return false;
    if (prev.coachData !== next.coachData) return false;

    if (prev.ctx.phase !== next.ctx.phase) return false;
    if (prev.ctx.currentPlayer !== next.ctx.currentPlayer) return false;
    if (prev.ctx.activePlayers?.[prev.ctx.currentPlayer] !== next.ctx.activePlayers?.[next.ctx.currentPlayer]) return false;

    if (prev.G.board === next.G.board) {
         return true;
    }
    return false;
}

export const HexOverlays = React.memo(({
    hex, G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, showCoachMode, coachData
}: HexOverlaysProps) => {
    const { recommendations, minScore, maxScore, top3Set } = coachData;

    // Use memoized geometry
    const { vertices, edges, corners, currentHexIdStr } = React.useMemo(() => {
        const cornerCoords = Array.from({ length: 6 }, (_, i) => hexCornerOffset(i));
        const rawVertexIds = getVerticesForHex(hex.coords);
        const rawEdgeIds = getEdgesForHex(hex.coords);

        const verticesWithParts = rawVertexIds.map(id => ({ id, parts: id.split('::') }));
        const edgesWithParts = rawEdgeIds.map(id => ({ id, parts: id.split('::') }));

        const idStr = `${hex.coords.q},${hex.coords.r},${hex.coords.s}`;

        return { vertices: verticesWithParts, edges: edgesWithParts, corners: cornerCoords, currentHexIdStr: idStr };
    }, [hex.coords.q, hex.coords.r, hex.coords.s]);

    const getPrimaryHexOwner = (parts: string[]): string => {
        return parts.find(ownerId => G.board.hexes[ownerId]) || parts[0];
    };

    return (
        <Hexagon q={hex.coords.q} r={hex.coords.r} s={hex.coords.s} cellStyle={{ fill: 'none', stroke: 'none' }}>
            {/* VERTICES */}
            {corners.map((corner, i) => {
                const { id: vId, parts } = vertices[i];
                const primaryHex = getPrimaryHexOwner(parts);

                if (primaryHex !== currentHexIdStr) return null;

                const vertex = G.board.vertices[vId];
                const isOccupied = !!vertex;
                const ownerColor = isOccupied ? G.players[vertex.owner]?.color : null;

                const isSetup = ctx.phase === PHASES.SETUP;
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];
                const isActingStage = ctx.phase === PHASES.GAMEPLAY && currentStage === STAGES.ACTING;

                let isClickable = false;
                let isGhost = false;
                let isRecommended = false;
                let recommendationData: CoachRecommendation | undefined;
                let heatmapColor = "";
                let isTop3 = false;
                let clickAction = () => {};

                const applyCoachRecommendation = () => {
                    const rec = recommendations[vId];
                    if (rec) {
                        isRecommended = true;
                        recommendationData = rec;
                        heatmapColor = getHeatmapColor(rec.score, minScore, maxScore);
                        if (top3Set.has(vId)) {
                            isTop3 = true;
                        }
                    }
                };

                if (isSetup) {
                    if (currentStage === STAGES.PLACE_SETTLEMENT && uiMode === 'placing') {
                        // REFACTOR: Use Shared Rules
                        if (isValidSettlementLocation(G, vId)) {
                            isClickable = true;
                            isGhost = true;
                            clickAction = () => {
                                safeMove(() => moves.placeSettlement(vId));
                            };
                            applyCoachRecommendation();
                        }
                    }
                } else if (isActingStage) {
                    if (buildMode === 'settlement') {
                        // REFACTOR: Use Shared Rules
                        if (isValidSettlementPlacement(G, vId, ctx.currentPlayer)) {
                             isClickable = true;
                             isGhost = true;
                             clickAction = () => {
                                 safeMove(() => moves.buildSettlement(vId));
                                 setBuildMode(null);
                             }
                             applyCoachRecommendation();
                        }
                    } else if (buildMode === 'city') {
                        // REFACTOR: Use Shared Rules
                        if (isValidCityPlacement(G, vId, ctx.currentPlayer)) {
                             isClickable = true;
                             isGhost = false;
                             clickAction = () => {
                                  safeMove(() => moves.buildCity(vId));
                                  setBuildMode(null);
                             }
                        }
                    }
                }

                return (
                    <g key={i} className="group" onClick={(e) => {
                        e.stopPropagation();
                        if (isClickable) clickAction();
                    }}>
                        <circle
                            cx={corner.x} cy={corner.y}
                            r={3}
                            fill="transparent"
                            style={{ cursor: isClickable ? 'pointer' : 'default' }}
                            data-testid={isGhost ? "ghost-vertex" : undefined}
                        />
                        {isOccupied && (
                            <BuildingIcon
                                vertex={vertex}
                                corner={corner}
                                ownerColor={ownerColor}
                            />
                        )}

                        {isGhost && (
                            <circle cx={corner.x} cy={corner.y} r={BOARD_CONFIG.GHOST_VERTEX_RADIUS} fill="white" opacity={0.5} className="ghost-vertex" />
                        )}

                        {isClickable && buildMode === 'city' && (
                             <circle cx={corner.x} cy={corner.y} r={4} fill="none" stroke="white" strokeWidth={1} className="animate-pulse motion-reduce:animate-none" />
                        )}

                        {isRecommended && (
                             <g
                                className={`coach-highlight transition-opacity duration-200 ${
                                    isTop3 || showCoachMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                data-tooltip-id="coach-tooltip"
                                data-tooltip-content={recommendationData ? vId : ""}
                             >
                                <circle
                                    cx={corner.x} cy={corner.y}
                                    r={4}
                                    fill={heatmapColor}
                                    opacity={0.6}
                                    stroke="none"
                                />
                                {isTop3 ? (
                                    <circle
                                        cx={corner.x} cy={corner.y}
                                        r={5}
                                        fill="none"
                                        stroke="#FFD700"
                                        strokeWidth={2}
                                        className="animate-pulse motion-reduce:animate-none"
                                    />
                                ) : (
                                    <circle
                                        cx={corner.x} cy={corner.y}
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
            })}

            {/* EDGES */}
            {corners.map((corner, i) => {
                const { id: eId, parts } = edges[i];
                const primaryHex = getPrimaryHexOwner(parts);

                if (primaryHex !== currentHexIdStr) return null;

                const nextCorner = corners[(i + 1) % 6];
                const midX = (corner.x + nextCorner.x) / 2;
                const midY = (corner.y + nextCorner.y) / 2;

                const edge = G.board.edges[eId];
                const isOccupied = !!edge;
                const ownerColor = isOccupied ? G.players[edge.owner]?.color : null;
                const angle = Math.atan2(nextCorner.y - corner.y, nextCorner.x - corner.x) * 180 / Math.PI;

                const isSetup = ctx.phase === PHASES.SETUP;
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];
                const isActingStage = ctx.phase === PHASES.GAMEPLAY && currentStage === STAGES.ACTING;

                let isClickable = false;
                let isGhost = false;
                let clickAction = () => {};

                if (isSetup) {
                     if (currentStage === STAGES.PLACE_ROAD && !isOccupied && uiMode === 'placing') {
                        // REFACTOR: Use Shared Rules
                        if (isValidSetupRoadPlacement(G, eId, ctx.currentPlayer)) {
                            isClickable = true;
                            isGhost = true;
                            clickAction = () => {
                                safeMove(() => moves.placeRoad(eId));
                                setUiMode('viewing');
                            };
                        }
                     }
                } else if (isActingStage) {
                    if (buildMode === 'road') {
                        // REFACTOR: Use Shared Rules
                        if (isValidRoadPlacement(G, eId, ctx.currentPlayer)) {
                             isClickable = true;
                             isGhost = true;
                             clickAction = () => {
                                safeMove(() => moves.buildRoad(eId));
                                setBuildMode(null);
                            }
                        }
                    }
                }

                return (
                     <g key={`edge-${i}`} onClick={(e) => {
                        e.stopPropagation();
                        if (isClickable) clickAction();
                    }}>
                        <circle cx={midX} cy={midY} r={2.5} fill="transparent" style={{ cursor: isClickable ? 'pointer' : 'default' }} />
                        {isOccupied && (
                            <rect
                                x={midX - 3} y={midY - 1}
                                width={6} height={2}
                                fill={ownerColor || 'none'}
                                transform={`rotate(${angle} ${midX} ${midY})`}
                            />
                        )}
                         {isGhost && (
                            <rect
                                x={midX - 3} y={midY - 1}
                                width={6} height={2}
                                fill="white" opacity={0.5}
                                transform={`rotate(${angle} ${midX} ${midY})`}
                                data-testid="ghost-edge"
                            />
                        )}
                    </g>
                );
            })}
        </Hexagon>
    );
}, arePropsEqual);
