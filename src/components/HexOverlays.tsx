import React from 'react';
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

function arePropsEqual(prev: HexOverlaysProps, next: HexOverlaysProps) {
    if (prev.buildMode !== next.buildMode) return false;
    if (prev.uiMode !== next.uiMode) return false;
    if (prev.showResourceHeatmap !== next.showResourceHeatmap) return false;
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
    hex, G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, showResourceHeatmap, coachData
}: HexOverlaysProps) => {
    const { recommendations, minScore, maxScore, top3Set } = coachData;

    // Use static/cached geometry
    const { vertices, edges, currentHexIdStr } = getHexGeometry(hex);

    // Use shared rules hook
    const { validSettlements, validCities, validRoads } = useBoardInteractions(G, ctx, ctx.currentPlayer);

    const getPrimaryHexOwner = (parts: string[]): string => {
        // eslint-disable-next-line security/detect-object-injection
        return parts.find(ownerId => G.board.hexes[ownerId]) || parts[0];
    };

    return (
        <Hexagon q={hex.coords.q} r={hex.coords.r} s={hex.coords.s} cellStyle={{ fill: 'none', stroke: 'none' }}>
            {/* VERTICES */}
            {HEX_CORNERS.map((corner, i) => {
                // eslint-disable-next-line security/detect-object-injection
                const { id: vId, parts } = vertices[i];
                const primaryHex = getPrimaryHexOwner(parts);

                if (primaryHex !== currentHexIdStr) return null;

                // Security: Validate vId before access to prevent prototype pollution (handled in ternary)
                // eslint-disable-next-line security/detect-object-injection
                const vertex = Object.prototype.hasOwnProperty.call(G.board.vertices, vId) ? G.board.vertices[vId] : undefined;
                const ownerColor = (vertex && G.players[vertex.owner]?.color) || null;

                const isSetup = ctx.phase === PHASES.SETUP;
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];
                const isActingStage = ctx.phase === PHASES.GAMEPLAY && currentStage === STAGES.ACTING;

                let isClickable = false;
                let isGhost = false;
                let recommendationData: CoachRecommendation | undefined;
                let heatmapColor = "";
                let isTop3 = false;
                let clickAction = () => {};

                const applyCoachRecommendation = () => {
                    const rec = recommendations[vId]; // eslint-disable-line security/detect-object-injection
                    if (rec) {
                        recommendationData = rec;
                        heatmapColor = getHeatmapColor(rec.score, minScore, maxScore);
                        if (top3Set.has(vId)) {
                            isTop3 = true;
                        }
                    }
                };

                if (isSetup) {
                    if (currentStage === STAGES.PLACE_SETTLEMENT && uiMode === 'placing') {
                        if (validSettlements.has(vId)) {
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
                        if (validSettlements.has(vId)) {
                             isClickable = true;
                             isGhost = true;
                             clickAction = () => {
                                 safeMove(() => moves.buildSettlement(vId));
                                 setBuildMode(null);
                             }
                             applyCoachRecommendation();
                        }
                    } else if (buildMode === 'city') {
                        if (validCities.has(vId)) {
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
                    <OverlayVertex
                        key={i}
                        vId={vId}
                        cx={corner.x}
                        cy={corner.y}
                        vertex={vertex}
                        ownerColor={ownerColor}
                        isClickable={isClickable}
                        isGhost={isGhost}
                        onClick={clickAction}
                        buildMode={buildMode}
                        recommendation={recommendationData ? {
                            heatmapColor,
                            isTop3,
                            data: recommendationData
                        } : undefined}
                        showResourceHeatmap={showResourceHeatmap}
                    />
                );
            })}

            {/* EDGES */}
            {HEX_CORNERS.map((corner, i) => {
                // eslint-disable-next-line security/detect-object-injection
                const { id: eId, parts } = edges[i];
                const primaryHex = getPrimaryHexOwner(parts);

                if (primaryHex !== currentHexIdStr) return null;

                const nextCorner = HEX_CORNERS[(i + 1) % 6];
                const midX = (corner.x + nextCorner.x) / 2;
                const midY = (corner.y + nextCorner.y) / 2;

                // Security: Validate eId before access
                const edge = Object.prototype.hasOwnProperty.call(G.board.edges, eId) ? G.board.edges[eId] : undefined; // eslint-disable-line security/detect-object-injection
                const isOccupied = !!edge;
                const ownerColor = (edge && G.players[edge.owner]?.color) || null;
                const angle = Math.atan2(nextCorner.y - corner.y, nextCorner.x - corner.x) * 180 / Math.PI;

                const isSetup = ctx.phase === PHASES.SETUP;
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];
                const isActingStage = ctx.phase === PHASES.GAMEPLAY && currentStage === STAGES.ACTING;

                let isClickable = false;
                let isGhost = false;
                let clickAction = () => {};

                if (isSetup) {
                     if (currentStage === STAGES.PLACE_ROAD && !isOccupied && uiMode === 'placing') {
                        if (validRoads.has(eId)) {
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
                        if (validRoads.has(eId)) {
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
                    <OverlayEdge
                        key={`edge-${i}`}
                        cx={midX}
                        cy={midY}
                        angle={angle}
                        isOccupied={isOccupied}
                        ownerColor={ownerColor}
                        isClickable={isClickable}
                        isGhost={isGhost}
                        onClick={clickAction}
                    />
                );
            })}
        </Hexagon>
    );
}, arePropsEqual);
