import React, { useState } from 'react';
// @ts-ignore
import { HexGrid, Layout, Hexagon } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Hex } from '../game/types';
import { GameHex } from './GameHex';
import { getVerticesForHex, getEdgesForHex, getEdgesForVertex } from '../game/hexUtils';
import { PlayerPanel } from './PlayerPanel';
import AnalystPanel from './AnalystPanel';
import { GameLayout } from './GameLayout';
import { useResponsiveViewBox } from '../hooks/useResponsiveViewBox';
import { BOARD_CONFIG } from '../game/config';
import { GameControls, BuildMode } from './GameControls';
import './Board.css';

export interface CatanBoardProps extends BoardProps<GameState> {}

export const Board: React.FC<CatanBoardProps> = ({ G, ctx, moves }) => {
  const hexes = Object.values(G.board.hexes);
  const viewBox = useResponsiveViewBox();
  const [buildMode, setBuildMode] = useState<BuildMode>(null);

  const BoardContent = (
    <div className="board-container">
      <PlayerPanel players={G.players} currentPlayerId={ctx.currentPlayer} />

      <GameControls
        G={G}
        ctx={ctx}
        moves={moves}
        buildMode={buildMode}
        setBuildMode={setBuildMode}
      />

      <div className="board-controls">
        {G.lastRoll[0] > 0 && (
          <div className="last-roll">
            Last Roll: {G.lastRoll[0]} + {G.lastRoll[1]} = {G.lastRoll[0] + G.lastRoll[1]}
          </div>
        )}
      </div>

      <HexGrid width="100%" height="100%" viewBox={viewBox}>
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
      dashboard={
        <AnalystPanel
          stats={G.boardStats}
          onRegenerate={() => moves.regenerateBoard()}
          showRegenerate={ctx.phase === 'setup'}
        />
      }
    />
  );
};

const HexOverlays = ({
    hex, G, ctx, moves, buildMode, setBuildMode
}: {
    hex: Hex,
    G: GameState,
    ctx: BoardProps<GameState>['ctx'],
    moves: BoardProps<GameState>['moves'],
    buildMode: BuildMode,
    setBuildMode: (mode: BuildMode) => void
}) => {
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
    const corners = Array.from({ length: 6 }, (_, i) => 30 + i * 60).map(angle => {
        const rad = (angle * Math.PI) / 180;
        return {
            x: size * Math.cos(rad),
            y: size * Math.sin(rad)
        };
    });

    const vertices = getVerticesForHex(hex.coords);
    const edges = getEdgesForHex(hex.coords);

    return (
        <Hexagon q={hex.coords.q} r={hex.coords.r} s={hex.coords.s} cellStyle={{ fill: 'none', stroke: 'none' }}>
            {/* VERTICES */}
            {corners.map((corner, i) => {
                const vId = vertices[i];
                const primaryHex = vId.split('::')[0];
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
                let clickAction = () => {};

                if (isSetup) {
                    if (currentStage === 'placeSettlement' && !isOccupied && !isTooClose(vId)) {
                        isClickable = true;
                        isGhost = true;
                        clickAction = () => moves.placeSettlement(vId);
                    }
                } else if (isGameplay) {
                    if (buildMode === 'settlement' && !isOccupied && !isTooClose(vId)) {
                        // TODO: Add strict connectivity check for settlements in gameplay if needed
                        isClickable = true;
                        isGhost = true;
                        clickAction = () => {
                            moves.buildSettlement(vId);
                            setBuildMode(null);
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
                            <circle cx={corner.x} cy={corner.y} r={1} fill="white" opacity={0.5} className="ghost-vertex" />
                        )}
                        {/* Highlight upgrade target */}
                        {isClickable && buildMode === 'city' && (
                             <circle cx={corner.x} cy={corner.y} r={4} fill="none" stroke="white" strokeWidth={1} className="animate-pulse" />
                        )}
                    </g>
                );
            })}

            {/* EDGES */}
            {corners.map((corner, i) => {
                const eId = edges[i];
                const primaryHex = eId.split('::')[0];
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
                        const isConnected = G.lastPlacedSettlement && getEdgesForVertex(G.lastPlacedSettlement).includes(eId);
                        if (isConnected) {
                            isClickable = true;
                            isGhost = true;
                            clickAction = () => moves.placeRoad(eId);
                        }
                     }
                } else if (isGameplay) {
                    if (buildMode === 'road' && !isOccupied) {
                        // TODO: Add connectivity check for roads in gameplay
                        isClickable = true;
                        isGhost = true;
                        clickAction = () => {
                             moves.buildRoad(eId);
                             setBuildMode(null);
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
