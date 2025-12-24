import React, { useState, useEffect } from 'react';
// @ts-ignore
import { HexGrid, Layout, Hexagon } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Hex } from '../game/types';
import { GameHex } from './GameHex';
import { getVerticesForHex, getEdgesForHex, getEdgesForVertex } from '../game/hexUtils';
import { PlayerPanel } from './PlayerPanel';
import AnalystPanel from './AnalystPanel';
import { Toast } from './Toast';
import { getBestPlacements } from '../game/analysis/coach';
import './Board.css';

export interface CatanBoardProps extends BoardProps<GameState> {}

export const Board: React.FC<CatanBoardProps> = ({ G, ctx, moves }) => {
  const hexes = Object.values(G.board.hexes);
  const [showHints, setShowHints] = useState(false);
  const [bestPlacements, setBestPlacements] = useState<Set<string>>(new Set());

  // Calculate best placements whenever G changes (if hints are on)
  useEffect(() => {
    if (showHints) {
        const suggestions = getBestPlacements(G);
        // Take top 3

        const top3 = suggestions.slice(0, 3).map(p => p.vertexId);
        setBestPlacements(new Set(top3));
    } else {
        setBestPlacements(new Set());
    }
  }, [G, showHints]);

  return (
    <div className="game-layout">
      <Toast feedback={G.lastFeedback} />
      <div className="board-container">
        <PlayerPanel players={G.players} currentPlayerId={ctx.currentPlayer} />

        <div className="board-controls">
            {ctx.phase === 'GAMEPLAY' && !G.hasRolled && ctx.activePlayers?.[ctx.currentPlayer] === 'roll' && (
                <button className="roll-btn" onClick={() => moves.rollDice()}>
                    Roll Dice
                </button>
            )}
             {G.lastRoll[0] > 0 && (
                <div className="last-roll">
                    Last Roll: {G.lastRoll[0]} + {G.lastRoll[1]} = {G.lastRoll[0] + G.lastRoll[1]}
                </div>
            )}
            {ctx.phase === 'setup' && (
               <button className="regenerate-btn" onClick={() => moves.regenerateBoard()}>
                   Regenerate Board
               </button>
            )}
        </div>

        <HexGrid width={800} height={800} viewBox="-50 -50 100 100">
          <Layout size={{ x: 8, y: 8 }} flat={false} spacing={1.02} origin={{ x: 0, y: 0 }}>
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
                      bestPlacements={bestPlacements}
                  />
              ))}
            </g>
          </Layout>
        </HexGrid>
      </div>

      <aside className="sidebar">
        <AnalystPanel
            stats={G.boardStats}
            showHints={showHints}
            onToggleHints={setShowHints}
        />
      </aside>
    </div>
  );
};

const HexOverlays = ({ hex, G, ctx, moves, bestPlacements }: {
    hex: Hex,
    G: GameState,
    ctx: BoardProps<GameState>['ctx'],
    moves: BoardProps<GameState>['moves'],
    bestPlacements: Set<string>
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
            {corners.map((corner, i) => {
                const vId = vertices[i];
                const primaryHex = vId.split('::')[0];
                if (primaryHex !== `${hex.coords.q},${hex.coords.r},${hex.coords.s}`) return null;

                const vertex = G.board.vertices[vId];
                const isOccupied = !!vertex;
                const isSettlementPhase = ctx.activePlayers?.[ctx.currentPlayer] === 'placeSettlement';
                const ownerColor = isOccupied ? G.players[vertex.owner]?.color : null;
                const validSpot = !isOccupied && isSettlementPhase && !isTooClose(vId);
                const isRecommended = bestPlacements.has(vId);

                // Flashing effect logic can be done via CSS class 'flash-ring' if implemented.
                // For now, static gold ring.

                const showFlash = G.lastFeedback?.quality === 'bad' && G.lastFeedback?.bestSpotId === vId;

                return (
                    <g key={i} onClick={(e) => {
                        e.stopPropagation();
                        if (validSpot) moves.placeSettlement(vId);
                    }}>
                        <circle cx={corner.x} cy={corner.y} r={3} fill="transparent" style={{ cursor: validSpot ? 'pointer' : 'default' }} />
                        {isOccupied && (
                            <rect
                                x={corner.x - 2} y={corner.y - 2}
                                width={4} height={4}
                                fill={ownerColor || 'none'}
                                stroke="black" strokeWidth={0.5}
                            />
                        )}
                        {validSpot && (
                            <circle cx={corner.x} cy={corner.y} r={1} fill="white" opacity={0.3} className="ghost-vertex" />
                        )}
                        {isRecommended && validSpot && (
                             <circle cx={corner.x} cy={corner.y} r={2.5} fill="none" stroke="gold" strokeWidth={1} />
                        )}
                        {showFlash && (
                             <circle cx={corner.x} cy={corner.y} r={4} fill="none" stroke="yellow" strokeWidth={2} className="flash-ring" />
                        )}
                    </g>
                );
            })}

            {corners.map((corner, i) => {
                const eId = edges[i];
                const primaryHex = eId.split('::')[0];
                if (primaryHex !== `${hex.coords.q},${hex.coords.r},${hex.coords.s}`) return null;

                const nextCorner = corners[(i + 1) % 6];
                const midX = (corner.x + nextCorner.x) / 2;
                const midY = (corner.y + nextCorner.y) / 2;

                const edge = G.board.edges[eId];
                const isOccupied = !!edge;
                const isRoadPhase = ctx.activePlayers?.[ctx.currentPlayer] === 'placeRoad';
                const ownerColor = isOccupied ? G.players[edge.owner]?.color : null;
                const isLastSettlementConnected = G.lastPlacedSettlement && getEdgesForVertex(G.lastPlacedSettlement).includes(eId);

                const angle = Math.atan2(nextCorner.y - corner.y, nextCorner.x - corner.x) * 180 / Math.PI;

                return (
                     <g key={`edge-${i}`} onClick={(e) => {
                        e.stopPropagation();
                        if (!isOccupied && isRoadPhase) moves.placeRoad(eId);
                    }}>
                        <circle cx={midX} cy={midY} r={2.5} fill="transparent" style={{ cursor: 'pointer' }} />
                        {isOccupied && (
                            <rect
                                x={midX - 3} y={midY - 1}
                                width={6} height={2}
                                fill={ownerColor || 'none'}
                                transform={`rotate(${angle} ${midX} ${midY})`}
                            />
                        )}
                         {!isOccupied && isRoadPhase && isLastSettlementConnected && (
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
