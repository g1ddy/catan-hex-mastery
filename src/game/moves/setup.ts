import { Move } from 'boardgame.io';
import { GameState, TerrainType } from '../types';
import { STAGES } from '../constants';
import { getVerticesForHex, getEdgeId } from '../hexUtils';

export const placeSettlement: Move<GameState> = ({ G, ctx, events }, vertexId: string) => {
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
  G.players[ctx.currentPlayer].settlements.push(vertexId);
  G.players[ctx.currentPlayer].victoryPoints += 1; // Settlement worth 1 VP

  // Resource Grant (Round 2 Only)
  // Check if this is the second settlement for this player
  if (G.players[ctx.currentPlayer].settlements.length === 2) {
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
            G.players[ctx.currentPlayer].resources[res as keyof typeof G.players[string]['resources']]++;
          }
      }
    });
  }

  // Update active round metadata (optional but good for tracking)
  const numPlayers = Object.keys(G.players).length;
  if (ctx.turn >= numPlayers && G.setupPhase.activeRound === 1) {
      G.setupPhase.activeRound = 2;
  }

  // State Transition
  if (events && events.setActivePlayers) {
      events.setActivePlayers({ currentPlayer: STAGES.PLACE_ROAD });
  }
};

export const placeRoad: Move<GameState> = ({ G, ctx, events }, edgeId: string) => {
  // 1. Validation: Occupancy
  if (G.board.edges[edgeId]) {
    throw new Error("This edge is already occupied");
  }

  // 2. Validation: Connection
  // Must connect to the player's last placed settlement (immediate road placement rule)
  const lastSettlementId = G.players[ctx.currentPlayer].settlements.at(-1);

  if (!lastSettlementId) {
      throw new Error("No active settlement found to connect to");
  }

  const connectedEdges = getEdgesForVertex(lastSettlementId);
  if (!connectedEdges.includes(edgeId)) {
      throw new Error("Road must connect to your just-placed settlement");
  }

  // Execution
  G.board.edges[edgeId] = { owner: ctx.currentPlayer };
  G.players[ctx.currentPlayer].roads.push(edgeId);

  // State Transition
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
