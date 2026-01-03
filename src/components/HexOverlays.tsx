import React from 'react';
import { Hexagon } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Hex } from '../game/types';
import { getVerticesForHex, getEdgesForHex, getEdgesForVertex, getVerticesForEdge, getVertexNeighbors } from '../game/hexUtils';
import { hexCornerOffset } from '../game/geometry';
import { BOARD_CONFIG } from '../game/config';
import { BuildMode, UiMode } from './GameControls';
import { getHeatmapColor, CoachRecommendation } from '../game/analysis/coach';
import { safeMove } from '../utils/moveUtils';
import { PHASES, STAGES } from '../game/constants';
import { Home, Castle } from 'lucide-react';

const SETTLEMENT_ICON_SIZE = 5;
const CITY_ICON_SIZE = 6;

interface CoachData {
    recommendations: Record<string, CoachRecommendation>;
    minScore: number;
    maxScore: number;
    top3Set: Set<string>;
}

interface BuildingIconProps {
    vertex: { type: 'settlement' | 'city'; owner: string };
    corner: { x: number; y: number };
    ownerColor: string | null | undefined;
}

export const BuildingIcon: React.FC<BuildingIconProps> = ({ vertex, corner, ownerColor }) => {
    const isSettlement = vertex.type === 'settlement';
    const Icon = isSettlement ? Home : Castle;
    const size = isSettlement ? SETTLEMENT_ICON_SIZE : CITY_ICON_SIZE;
    const typeName = isSettlement ? 'settlement' : 'city';

    return (
        <Icon
            x={corner.x - size / 2}
            y={corner.y - size / 2}
            width={size}
            height={size}
            fill={ownerColor || 'none'}
            stroke="black"
            strokeWidth={1}
            data-testid={`${typeName}-icon`}
            aria-label={`${typeName.charAt(0).toUpperCase() + typeName.slice(1)} owned by Player ${Number(vertex.owner) + 1}`}
            role="img"
        />
    );
};

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

export const HexOverlays = React.memo(({
    hex, G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, showCoachMode, coachData
}: HexOverlaysProps) => {
    // Unpack pre-calculated coach data from parent
    const { recommendations, minScore, maxScore, top3Set } = coachData;

    const isTooClose = (vertexId: string) => {
        const neighbors = getVertexNeighbors(vertexId);
        return neighbors.some(n => G.board.vertices[n]);
    };

    const size = 8;
    // Use the centralized geometry
    const corners = Array.from({ length: 6 }, (_, i) => hexCornerOffset(i, size));

    const vertices = getVerticesForHex(hex.coords);
    const edges = getEdgesForHex(hex.coords);

    const getPrimaryHexOwner = (id: string): string => {
        const potentialOwners = id.split('::');
        // Fix: Find the first hex ID in the key that actually exists on the board.
        // This prevents "off-board" hexes (which don't exist in G.board.hexes) from being assigned ownership,
        // which would cause the element to not render at all.
        return potentialOwners.find(ownerId => G.board.hexes[ownerId]) || potentialOwners[0];
    };

    return (
        <Hexagon q={hex.coords.q} r={hex.coords.r} s={hex.coords.s} cellStyle={{ fill: 'none', stroke: 'none' }}>
            {/* VERTICES */}
            {corners.map((corner, i) => {
                const vId = vertices[i];
                const primaryHex = getPrimaryHexOwner(vId);

                if (primaryHex !== `${hex.coords.q},${hex.coords.r},${hex.coords.s}`) return null;

                const vertex = G.board.vertices[vId];
                const isOccupied = !!vertex;
                const ownerColor = isOccupied ? G.players[vertex.owner]?.color : null;

                // Interaction Logic
                const isSetup = ctx.phase === PHASES.SETUP;
                // Interaction logic mostly for action phase, but checking phase generically
                const isGameplay = ctx.phase === PHASES.GAMEPLAY;
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];

                const isActingStage = isGameplay && currentStage === STAGES.ACTING;

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
                    if (currentStage === STAGES.PLACE_SETTLEMENT && !isOccupied && !isTooClose(vId)) {
                        // Only activate ghost if uiMode is placing
                        if (uiMode === 'placing') {
                            isClickable = true;
                            isGhost = true;
                            clickAction = () => {
                                safeMove(() => moves.placeSettlement(vId));
                            };
                            applyCoachRecommendation();
                        }
                    }
                } else if (isActingStage) {
                    if (buildMode === 'settlement' && !isOccupied && !isTooClose(vId)) {
                        // Strict connectivity check for settlements
                        const adjEdges = getEdgesForVertex(vId);
                        const hasOwnRoad = adjEdges.some(eId => {
                            const edge = G.board.edges[eId];
                            return edge && edge.owner === ctx.currentPlayer;
                        });

                        if (hasOwnRoad) {
                            isClickable = true;
                            isGhost = true;
                            clickAction = () => {
                                safeMove(() => moves.buildSettlement(vId));
                                setBuildMode(null);
                            }
                            applyCoachRecommendation();
                        }
                    } else if (buildMode === 'city' && isOccupied && vertex.owner === ctx.currentPlayer && vertex.type === 'settlement') {
                        isClickable = true;
                        isGhost = false; // It's upgrading an existing one
                        clickAction = () => {
                             safeMove(() => moves.buildCity(vId));
                             setBuildMode(null);
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

                        {/* Ghost Vertex (White Dot for Click Target) */}
                        {isGhost && (
                            <circle cx={corner.x} cy={corner.y} r={BOARD_CONFIG.GHOST_VERTEX_RADIUS} fill="white" opacity={0.5} className="ghost-vertex" />
                        )}

                         {/* Highlight upgrade target */}
                        {isClickable && buildMode === 'city' && (
                             <circle cx={corner.x} cy={corner.y} r={4} fill="none" stroke="white" strokeWidth={1} className="animate-pulse" />
                        )}

                        {/* Heatmap Overlay */}
                        {isRecommended && (
                             <g
                                className={`coach-highlight transition-opacity duration-200 ${
                                    isTop3 || showCoachMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                data-tooltip-id="coach-tooltip"
                                data-tooltip-content={recommendationData ? JSON.stringify(recommendationData) : ""}
                             >
                                {/* Base Heatmap Circle */}
                                <circle
                                    cx={corner.x} cy={corner.y}
                                    r={4}
                                    fill={heatmapColor}
                                    opacity={0.6}
                                    stroke="none"
                                />

                                {/* Top 3 Highlight (Gold Ring) */}
                                {isTop3 && (
                                    <circle
                                        cx={corner.x}
                                        cy={corner.y}
                                        r={5}
                                        fill="none"
                                        stroke="#FFD700"
                                        strokeWidth={2}
                                        className="animate-pulse"
                                    />
                                )}

                                {/* Subtle ring for all recommendations */}
                                {!isTop3 && (
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
                const eId = edges[i];
                const primaryHex = getPrimaryHexOwner(eId);

                if (primaryHex !== `${hex.coords.q},${hex.coords.r},${hex.coords.s}`) return null;

                const nextCorner = corners[(i + 1) % 6];
                const midX = (corner.x + nextCorner.x) / 2;
                const midY = (corner.y + nextCorner.y) / 2;

                const edge = G.board.edges[eId];
                const isOccupied = !!edge;
                const ownerColor = isOccupied ? G.players[edge.owner]?.color : null;
                const angle = Math.atan2(nextCorner.y - corner.y, nextCorner.x - corner.x) * 180 / Math.PI;

                // Interaction Logic
                const isSetup = ctx.phase === PHASES.SETUP;
                const isGameplay = ctx.phase === PHASES.GAMEPLAY;
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];

                const isActingStage = isGameplay && currentStage === STAGES.ACTING;


                let isClickable = false;
                let isGhost = false;
                let clickAction = () => {};

                if (isSetup) {
                     if (currentStage === STAGES.PLACE_ROAD && !isOccupied) {
                         // Only activate ghost if uiMode is placing
                        if (uiMode === 'placing') {
                            // Valid connection logic: must connect to the player's last placed settlement
                            const lastSettlementId = G.players[ctx.currentPlayer].settlements.at(-1);
                            const isConnected = lastSettlementId && getEdgesForVertex(lastSettlementId).includes(eId);

                            if (isConnected) {
                                isClickable = true;
                                isGhost = true;
                                clickAction = () => {
                                    safeMove(() => moves.placeRoad(eId));
                                    setUiMode('viewing');
                                };
                            }
                        }
                     }
                } else if (isActingStage) {
                    if (buildMode === 'road' && !isOccupied) {
                         const endpoints = getVerticesForEdge(eId);

                         const hasConnection = (vId: string): boolean => {
                            const building = G.board.vertices[vId];
                            // Connected to own settlement/city
                            if (building && building.owner === ctx.currentPlayer) return true;
                            // Blocked by opponent's settlement/city
                            if (building && building.owner !== ctx.currentPlayer) return false;
                            // Connected to own road
                            const adjEdges = getEdgesForVertex(vId);
                            return adjEdges.some(adjEdgeId => {
                                if (adjEdgeId === eId) return false;
                                const edge = G.board.edges[adjEdgeId];
                                return edge && edge.owner === ctx.currentPlayer;
                            });
                        };

                        if (endpoints.some(hasConnection)) {
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
});
