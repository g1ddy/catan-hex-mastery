import { Move } from 'boardgame.io';
import { GameState, TerrainType } from '../types';
import { getVerticesForHex, getEdgeId } from '../hexUtils';

export const placeSettlement: Move<GameState> = ({ G, ctx, events }, vertexId: string) => {
  const player = G.players[ctx.currentPlayer];

  // Validation: Sequence
  // Note: Stage enforcement ensures this method is only callable in PLACE_SETTLEMENT stage.
  // We keep this check as a secondary safety measure or if stages are ever misconfigured.
  if (player.settlements.length !== player.roads.length) {
    throw new Error("You must place a road before placing another settlement");
  }

  // 1. Validation: Occupancy
  if (G.board.vertices[vertexId]) {
    throw new Error("This vertex is already occupied");
  }

  // 2. Validation: Distance Rule
  // Implementation of Occupancy check:
  const neighbors = getVertexNeighbors(vertexId);
  for (const nId of neighbors) {
    if (G.board.vertices[nId]) {
      throw new Error("Settlement is too close to another building");
    }
  }

  // Execution
  G.board.vertices[vertexId] = { owner: ctx.currentPlayer, type: 'settlement' };
  player.settlements.push(vertexId);
  player.victoryPoints += 1; // Settlement worth 1 VP

  // Resource Grant (Round 2 Only)
  // Check if this is the second settlement for this player
  if (player.settlements.length === 2) {
    // Grant resources
    const touchingHexes = getHexesForVertex(vertexId);
    touchingHexes.forEach(hId => {
      const hex = G.board.hexes[hId];
      if (hex && hex.terrain !== TerrainType.Desert && hex.terrain !== TerrainType.Sea) {
          const resourceMap: Record<TerrainType, string> = {
            [TerrainType.Forest]: 'wood',
            [TerrainType.Hills]: 'brick',
            [TerrainType.Pasture]: 'sheep',
            [TerrainType.Fields]: 'wheat',
            [TerrainType.Mountains]: 'ore',
            [TerrainType.Desert]: '',
            [TerrainType.Sea]: ''
          };
          const res = resourceMap[hex.terrain];
          if (res) {
            player.resources[res as keyof typeof player.resources]++;
          }
      }
    });
  }

  // State Transition: Advance to Road Placement
  if (events && events.endStage) {
      events.endStage();
  }
};

export const placeRoad: Move<GameState> = ({ G, ctx, events }, edgeId: string) => {
  const player = G.players[ctx.currentPlayer];

  // Validation: Sequence
  // Stage enforcement ensures this is only callable in PLACE_ROAD stage.
  if (player.settlements.length <= player.roads.length) {
      throw new Error("You must place a settlement before placing a road");
  }

  // 1. Validation: Occupancy
  if (G.board.edges[edgeId]) {
    throw new Error("This edge is already occupied");
  }

  // 2. Validation: Connection
  // Must connect to the JUST placed settlement (the last one in the array)
  // Logic: The last settlement in the list is the one placed in the immediately preceding 'placeSettlement' stage.
  const lastPlacedSettlement = player.settlements[player.settlements.length - 1];
  // Note: lastPlacedSettlement guaranteed to exist because player.settlements.length > player.roads.length >= 0

  const connectedEdges = getEdgesForVertex(lastPlacedSettlement);
  if (!connectedEdges.includes(edgeId)) {
      throw new Error("Road must connect to your just-placed settlement");
  }

  // Execution
  G.board.edges[edgeId] = { owner: ctx.currentPlayer };
  player.roads.push(edgeId);

  // State Transition
  // End turn after placing road
  if (events && events.endTurn) {
      events.endTurn();
  }
};


// --- Helpers ---

function parseVertexId(id: string) {
    return id.split('::').map(s => {
        const [q, r, sCoords] = s.split(',').map(Number);
        return { q, r, s: sCoords };
    });
}

function getVertexNeighbors(vertexId: string): string[] {
    const hexes = parseVertexId(vertexId);
    const neighbors: string[] = [];
    const pairs = [
        [hexes[0], hexes[1]],
        [hexes[1], hexes[2]],
        [hexes[2], hexes[0]]
    ];

    pairs.forEach(pair => {
       const vA = getVerticesForHex(pair[0]);
       const vB = getVerticesForHex(pair[1]);
       const common = vA.filter(id => vB.includes(id));
       const n = common.find(id => id !== vertexId);
       if (n) neighbors.push(n);
    });

    return neighbors;
}

function getHexesForVertex(vertexId: string): string[] {
    const hexes = parseVertexId(vertexId);
    return hexes.map(h => `${h.q},${h.r},${h.s}`);
}

function getEdgesForVertex(vertexId: string): string[] {
    const hexes = parseVertexId(vertexId);
    return [
        getEdgeId(hexes[0], hexes[1]),
        getEdgeId(hexes[1], hexes[2]),
        getEdgeId(hexes[2], hexes[0])
    ];
}
