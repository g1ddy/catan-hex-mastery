import React, { useState } from 'react';
// @ts-ignore
import { HexGrid, Layout, Hexagon } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Hex } from '../game/types';
import { GameHex } from './GameHex';
import { getVerticesForHex, getEdgesForHex, getEdgesForVertex, getVerticesForEdge } from '../game/hexUtils';
import { hexCornerOffset } from '../game/geometry';
import { PlayerPanel } from './PlayerPanel';
import AnalystPanel from './AnalystPanel';
import { GameLayout } from './GameLayout';
import { useResponsiveViewBox } from '../hooks/useResponsiveViewBox';
import { BOARD_CONFIG } from '../game/config';
import { GameControls, BuildMode, UiMode } from './GameControls';
import { useIsMobile } from '../hooks/useIsMobile';
import { getBestSettlementSpots } from '../game/analysis/coach';

export interface CatanBoardProps extends BoardProps<GameState> {
  onPlayerChange?: (playerID: string) => void;
}

export const Board: React.FC<CatanBoardProps> = ({ G, ctx, moves, playerID, onPlayerChange }) => {
  const hexes = Object.values(G.board.hexes);

  // Auto-switch Identity in Hotseat Mode
  React.useEffect(() => {
    if (onPlayerChange && playerID !== ctx.currentPlayer) {
      onPlayerChange(ctx.currentPlayer);
    }
  }, [ctx.currentPlayer, playerID, onPlayerChange]);

  const viewBox = useResponsiveViewBox();
  const [buildMode, setBuildMode] = useState<BuildMode>(null);
  const [uiMode, setUiMode] = useState<UiMode>('viewing');
  const isMobile = useIsMobile();

  const BoardContent = (
    <div className="absolute inset-0 overflow-hidden">

      <HexGrid
        width="100%"
        height="100%"
        viewBox={viewBox}
      >
        <Layout
          size={BOARD_CONFIG.HEX_SIZE}
          flat={false}
          spacing={BOARD_CONFIG.HEX_SPACING}
          origin={BOARD_CONFIG.HEX_ORIGIN}
        >
          <g>
            {hexes.map(hex => (
              <GameHex
                key={hex.id}
                hex={hex}
                onClick={() => {}}
              />
            ))}
          </g>
          <g>
            {hexes.map(hex => (
              <HexOverlays
                key={`overlay-${hex.id}`}
                hex={hex}
                G={G}
                ctx={ctx}
                moves={moves}
                buildMode={buildMode}
                setBuildMode={setBuildMode}
                uiMode={uiMode}
                setUiMode={setUiMode}
              />
            ))}
          </g>
        </Layout>
      </HexGrid>
    </div>
  );

  return (
    <GameLayout
      board={BoardContent}
      playerPanel={
        <PlayerPanel
          players={G.players}
          currentPlayerId={ctx.currentPlayer}
          variant={isMobile ? 'docked' : 'floating'}
        />
      }
      gameControls={
        <GameControls
          G={G}
          ctx={ctx}
          moves={moves}
          buildMode={buildMode}
          setBuildMode={setBuildMode}
          uiMode={uiMode}
          setUiMode={setUiMode}
          variant={isMobile ? 'docked' : 'floating'}
        />
      }
      dashboard={
        <AnalystPanel
          stats={G.boardStats}
          G={G}
          onRegenerate={() => moves.regenerateBoard()}
          showRegenerate={ctx.phase === 'setup'}
        />
      }
    />
  );
};

const HexOverlays = ({
    hex, G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode
}: {
    hex: Hex,
    G: GameState,
    ctx: BoardProps<GameState>['ctx'],
    moves: BoardProps<GameState>['moves'],
    buildMode: BuildMode,
    setBuildMode: (mode: BuildMode) => void,
    uiMode: UiMode,
    setUiMode: (mode: UiMode) => void
}) => {
    // Coach Recommendations
    const recommendations = React.useMemo(() => {
        if (ctx.phase === 'setup' && uiMode === 'placing') {
            return getBestSettlementSpots(G, ctx.currentPlayer);
        }
        return [];
    }, [G, ctx.phase, uiMode, ctx.currentPlayer]);

    const isTooClose = (vertexId: string) => {
        const occupied = Object.keys(G.board.vertices);
        const thisV = vertexId.split('::');

        for (const occId of occupied) {
            const thatV = occId.split('::');
            let matchCount = 0;
            for(const h1 of thisV) {
                if(thatV.includes(h1)) matchCount++;
            }
            if (matchCount >= 2) return true;
        }
        return false;
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
                const isSetup = ctx.phase === 'setup';
                const isGameplay = ctx.phase === 'GAMEPLAY';
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];

                let isClickable = false;
                let isGhost = false;
                let isRecommended = false;
                let recommendationReason = "";
                let clickAction = () => {};

                if (isSetup) {
                    if (currentStage === 'placeSettlement' && !isOccupied && !isTooClose(vId)) {
                        // Only activate ghost if uiMode is placing
                        if (uiMode === 'placing') {
                            isClickable = true;
                            isGhost = true;
                            clickAction = () => {
                                moves.placeSettlement(vId);
                                setUiMode('viewing'); // Reset after place
                            };

                            // Check recommendation
                            const rec = recommendations.find(r => r.vertexId === vId);
                            if (rec) {
                                isRecommended = true;
                                recommendationReason = `Score: ${rec.score} (${rec.reason})`;
                            }
                        }
                    }
                } else if (isGameplay) {
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
                                moves.buildSettlement(vId);
                                setBuildMode(null);
                            }
                        }
                    } else if (buildMode === 'city' && isOccupied && vertex.owner === ctx.currentPlayer && vertex.type === 'settlement') {
                        isClickable = true;
                        isGhost = false; // It's upgrading an existing one
                        clickAction = () => {
                             moves.buildCity(vId);
                             setBuildMode(null);
                        }
                    }
                }

                return (
                    <g key={i} onClick={(e) => {
                        e.stopPropagation();
                        if (isClickable) clickAction();
                    }}>
                        <circle cx={corner.x} cy={corner.y} r={3} fill="transparent" style={{ cursor: isClickable ? 'pointer' : 'default' }} />
                        {isOccupied && (
                            <React.Fragment>
                                <rect
                                    x={corner.x - 2} y={corner.y - 2}
                                    width={4} height={4}
                                    fill={ownerColor || 'none'}
                                    stroke="black" strokeWidth={0.5}
                                />
                                {vertex.type === 'city' && (
                                     <rect
                                        x={corner.x - 1} y={corner.y - 4}
                                        width={2} height={2}
                                        fill={ownerColor || 'none'}
                                        stroke="black" strokeWidth={0.5}
                                    />
                                )}
                            </React.Fragment>
                        )}
                        {isGhost && (
                            <circle cx={corner.x} cy={corner.y} r={isRecommended ? 1.5 : 1} fill="white" opacity={0.5} className="ghost-vertex" />
                        )}
                        {/* Highlight upgrade target */}
                        {isClickable && buildMode === 'city' && (
                             <circle cx={corner.x} cy={corner.y} r={4} fill="none" stroke="white" strokeWidth={1} className="animate-pulse" />
                        )}
                        {/* Coach Recommendation Highlight */}
                        {isRecommended && (
                             <g className="coach-highlight">
                                <circle cx={corner.x} cy={corner.y} r={5} fill="none" stroke="#FFD700" strokeWidth={2} className="animate-pulse" />
                                <title>{recommendationReason}</title>
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
                const isSetup = ctx.phase === 'setup';
                const isGameplay = ctx.phase === 'GAMEPLAY';
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];

                let isClickable = false;
                let isGhost = false;
                let clickAction = () => {};

                if (isSetup) {
                     if (currentStage === 'placeRoad' && !isOccupied) {
                         // Only activate ghost if uiMode is placing
                        if (uiMode === 'placing') {
                            const isConnected = G.setupPhase.activeSettlement && getEdgesForVertex(G.setupPhase.activeSettlement).includes(eId);
                            if (isConnected) {
                                isClickable = true;
                                isGhost = true;
                                clickAction = () => {
                                    moves.placeRoad(eId);
                                    setUiMode('viewing');
                                };
                            }
                        }
                     }
                } else if (isGameplay) {
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
                                moves.buildRoad(eId);
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
                            />
                        )}
                    </g>
                );
            })}
        </Hexagon>
    );
}
