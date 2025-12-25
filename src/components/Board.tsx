import React from 'react';
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
import './Board.css';

export interface CatanBoardProps extends BoardProps<GameState> {}

export const Board: React.FC<CatanBoardProps> = ({ G, ctx, moves }) => {
  const hexes = Object.values(G.board.hexes);
  const viewBox = useResponsiveViewBox();

  const BoardContent = (
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

const HexOverlays = ({ hex, G, ctx, moves }: { hex: Hex, G: GameState, ctx: BoardProps<GameState>['ctx'], moves: BoardProps<GameState>['moves'] }) => {
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
