import { Move } from 'boardgame.io';
import { GameState, TerrainType } from '../types';
import { getVerticesForHex, getEdgeId } from '../hexUtils';

export const placeSettlement: Move<GameState> = ({ G, ctx, events }, vertexId: string) => {
  // 1. Validation: Occupancy
  if (G.board.vertices[vertexId]) {
    return 'INVALID_MOVE'; // Already occupied
  }

  // 2. Validation: Distance Rule
  // Implementation of Occupancy check:
  const neighbors = getVertexNeighbors(vertexId);
  for (const nId of neighbors) {
    if (G.board.vertices[nId]) {
      return 'INVALID_MOVE'; // Distance rule violation
    }
  }

  // Execution
  G.board.vertices[vertexId] = { owner: ctx.currentPlayer, type: 'settlement' };
  G.players[ctx.currentPlayer].settlements.push(vertexId);
  G.players[ctx.currentPlayer].victoryPoints += 1; // Settlement worth 1 VP
  G.setupPhase.activeSettlement = vertexId;

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
  if (events && events.setStage) {
      events.setStage('placeRoad');
  }
};

export const placeRoad: Move<GameState> = ({ G, ctx, events }, edgeId: string) => {
  // 1. Validation: Occupancy
  if (G.board.edges[edgeId]) {
    return 'INVALID_MOVE';
  }

  // 2. Validation: Connection
  // Must connect to G.setupPhase.activeSettlement
  if (!G.setupPhase.activeSettlement) {
      return 'INVALID_MOVE'; // Should not happen in flow
  }

  const connectedEdges = getEdgesForVertex(G.setupPhase.activeSettlement);
  if (!connectedEdges.includes(edgeId)) {
      return 'INVALID_MOVE';
  }

  // Execution
  G.board.edges[edgeId] = { owner: ctx.currentPlayer };
  G.players[ctx.currentPlayer].roads.push(edgeId);
  G.setupPhase.activeSettlement = null; // Reset

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
