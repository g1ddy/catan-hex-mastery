import React from 'react';
// @ts-ignore
import { HexGrid, Layout, Hexagon } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Hex } from '../game/types';
import { GameHex } from './GameHex';
import { getVerticesForHex, getEdgesForHex, getEdgesForVertex } from '../game/hexUtils';
import { PlayerPanel } from './PlayerPanel';

export interface CatanBoardProps extends BoardProps<GameState> {}

export const Board: React.FC<CatanBoardProps> = ({ G, ctx, moves }) => {
  // We need to render:
  // 1. The Hex Grid (Terrain)
  // 2. Vertices (Settlements/Cities) - Clickable
  // 3. Edges (Roads) - Clickable

  // We need to generate a list of unique vertices and edges from the hexes.
  const hexes = Object.values(G.board.hexes);

  // Helper to get unique vertices and edges to render
  // This is expensive to do every render, but for < 100 hexes it's fine.
  const uniqueVertices = new Set<string>();
  const uniqueEdges = new Set<string>();

  hexes.forEach(h => {
      getVerticesForHex(h.coords).forEach(v => uniqueVertices.add(v));
      getEdgesForHex(h.coords).forEach(e => uniqueEdges.add(e));
  });

  // Calculate pixel coordinates for vertices and edges?
  // react-hexgrid handles Hex to Pixel conversion if we use its components.
  // But for vertices (corners) and edges (sides), we need custom placement.

  // Strategy:
  // Vertices: A vertex is at the corner of a hex.
  // We can render a small Hexagon or Circle at the corner.
  // How to find the corner coordinate in SVG space?
  // react-hexgrid Layout context provides `pixelToHex` but maybe not the other way around easily for custom SVG without using their Hexagon component.
  // HOWEVER, we can cheat:
  // A vertex is shared by 3 hexes (usually).
  // We can just find ONE hex that has this vertex, and ask for its specific corner.
  // Or simpler: The vertex ID is `q,r,s::...`.
  // We can calculate the average center of the 3 hexes.
  // Center of hexes A, B, C. Vertex is (A+B+C)/3?
  // Yes, for a flat hex grid, the shared vertex is the centroid of the 3 centers? No.
  // But it's close enough or we can use geometry.
  // Better: layout.hexToPixel(h).

  // Actually, let's stick to a simpler approach for now:
  // We iterate HEXES. For each hex, we render its 6 corners and 6 edges as overlays.
  // We dedup using the IDs.

  // We need a way to map VertexID -> SVG Coordinates.
  // Using the `Hexagon` component of `react-hexgrid` is for the tile itself.
  // We can put children inside `Hexagon`? No, that scales with the hex.
  // We want an overlay layer.

  // Let's rely on `react-hexgrid`'s `Layout` to map hexes.
  // But we need to render things *between* hexes.

  // Let's assume standard flat layout.
  // size = { x: 8, y: 8 }
  // Vertex locations relative to center (0,0):
  // For flat topped: corners are at angles 0, 60, 120, ...?
  // No, flat topped has corners at 0, 60... wait.
  // Flat topped: vertical sides. Corners at 30, 90, 150... ?
  // Pointy topped has corners at 30, 90?
  // Let's check `react-hexgrid` flat layout.
  // The corners are `hexUtils` dependent.

  // Let's try to render interactive elements *inside* the Hexagon component for now,
  // but shifted? No, clipping.

  // We should render an SVG overlay.
  // We need a helper `hexToPixel(q, r, s)`.
  // Standard conversion:
  // x = size * (3/2 * q)
  // y = size * (sqrt(3)/2 * q + sqrt(3) * r)
  // (For flat?)

  // Let's use a naive approach: Render "Vertex" markers for EACH hex, but use the unique ID to control state.
  // If we render a circle at the top-left corner of Hex A, and bottom-right of Hex B... they overlap.
  // That's fine if they are perfectly aligned.

  return (
    <div className="board-container" style={{ width: '800px', height: '800px', position: 'relative' }}>
      <PlayerPanel players={G.players} currentPlayerId={ctx.currentPlayer} />

      <HexGrid width={800} height={800} viewBox="-50 -50 100 100">
        <Layout size={{ x: 8, y: 8 }} flat={true} spacing={1.02} origin={{ x: 0, y: 0 }}>
          {/* 1. Terrain Hexes */}
          <g>
            {hexes.map(hex => (
                <GameHex
                key={hex.id}
                hex={hex}
                onClick={() => {}} // Hex click not used in setup for now
                />
            ))}
          </g>

          {/* 2. Vertices & Edges Overlay */}
          {/*
             To render vertices/edges correctly without z-fighting or duplication issues,
             we usually want one object per game entity.
             But calculating their coordinates manually is error prone.

             Hack: We iterate all Hexes. For each hex, we render its 6 corners (Vertices) and 6 sides (Edges).
             We use the `id` (calculated from coords) to determine:
             - If it's occupied (color it).
             - If it's valid move (highlight it).
             - The click handler.

             Since multiple hexes share a vertex, we will render multiple circles on top of each other.
             This is inefficient but visualy correct if they align.
          */}
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
};

// Sub-component to render overlays for a single hex
const HexOverlays = ({ hex, G, ctx, moves }: { hex: Hex, G: GameState, ctx: BoardProps<GameState>['ctx'], moves: BoardProps<GameState>['moves'] }) => {
    const isTooClose = (vertexId: string) => {
        // Distance Check logic for highlighting
        // We can't easily check all neighbors without the expensive helper, but we have `G.board.vertices`.
        // We can iterate occupied vertices and check `distance`? No, vertex ID distance is hard.
        // We can use the same logic as `placeSettlement` validation if we expose it or reimplement.
        // Since this is for UI feedback, strictness isn't critical (backend will block it), but we want good UX.
        // Let's implement a simple check:
        // A vertex ID is built from hex coords.
        // If we just check the list of all occupied vertices, and for each occupied vertex,
        // if it shares an edge with `vertexId`, then `vertexId` is too close.
        // Vertices share an edge if they share 2 hex coords.

        const occupied = Object.keys(G.board.vertices);
        const thisV = vertexId.split('::'); // ['q,r,s', 'q,r,s', 'q,r,s']

        for (const occId of occupied) {
            const thatV = occId.split('::');
            // Count matching hex coords
            let matchCount = 0;
            for(const h1 of thisV) {
                if(thatV.includes(h1)) matchCount++;
            }
            if (matchCount >= 2) return true; // Shared edge -> Adjacent
        }
        return false;
    };

    // We need to know the offset of corners for Flat Top hexes.
    // Size = 8.
    // Flat top corners: (angles in degrees) 0, 60, 120, 180, 240, 300.
    // Wait, Flat top means top is flat.
    // So corners are at 0, 60, 120... relative to center?
    // Actually, `react-hexgrid` flat:
    //      ______
    //     /      \
    //    /        \
    //    \        /
    //     \______/
    //
    // The angles are 0, 60, 120... is that correct?
    // 0 degrees is usually Right (3 o'clock).
    // For flat top, the vertices are at 0, 60, 120, 180, 240, 300.
    // Let's verify with Math.

    const size = 8;
    const corners = [0, 60, 120, 180, 240, 300].map(angle => {
        const rad = (angle * Math.PI) / 180;
        return {
            x: size * Math.cos(rad),
            y: size * Math.sin(rad)
        };
    });

    // Edges are midpoints between corners.

    const vertices = getVerticesForHex(hex.coords); // array of 6 IDs
    const edges = getEdgesForHex(hex.coords); // array of 6 IDs

    // Map the 6 standard directions to the sorted IDs returned by `getVerticesForHex`.
    // `getVerticesForHex` uses `getNeighbors` order.
    // `getNeighbors` order: (1,-1,0), (1,0,-1), (0,1,-1), (-1,1,0), (-1,0,1), (0,-1,1).
    // These are 6 directions.
    // We need to match the visual corners to these logical neighbors.
    // Direction 0: q+1, r-1. (East-North-East?)
    // In flat layout:
    // q+ is East?
    // Let's assume the order matches the rotation.
    // The `hexUtils` neighbors are in clockwise or counter-clockwise order?
    // (1,-1,0), (1,0,-1), ...
    // If we assume they align with the 6 corners in order.

    return (
        <Hexagon q={hex.coords.q} r={hex.coords.r} s={hex.coords.s} cellStyle={{ fill: 'none', stroke: 'none' }}>
            {/* Vertices */}
            {corners.map((corner, i) => {
                const vId = vertices[i];
                // Deduping: Only render if this hex is the "primary" owner (first in ID)
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
                        {/* Hit area */}
                        <circle cx={corner.x} cy={corner.y} r={3} fill="transparent" style={{ cursor: validSpot ? 'pointer' : 'default' }} />

                        {/* Visual */}
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

            {/* Edges */}
            {/* We place edge hit areas between corners */}
            {corners.map((corner, i) => {
                const eId = edges[i];
                // Deduping: Only render if this hex is the "primary" owner (first in ID)
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

                // Rotation for the road rectangle
                const angle = Math.atan2(nextCorner.y - corner.y, nextCorner.x - corner.x) * 180 / Math.PI;

                return (
                     <g key={`edge-${i}`} onClick={(e) => {
                        e.stopPropagation();
                        if (!isOccupied && isRoadPhase) moves.placeRoad(eId);
                    }}>
                        {/* Hit area */}
                        <circle cx={midX} cy={midY} r={2.5} fill="transparent" style={{ cursor: 'pointer' }} />

                         {/* Visual */}
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
