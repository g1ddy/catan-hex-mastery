import { Move } from 'boardgame.io';
import { GameState, TerrainType } from '../types';
import { getVerticesForHex, getEdgeId } from '../hexUtils';

export const placeSettlement: Move<GameState> = ({ G, ctx, events }, vertexId: string) => {
  // 1. Validation: Occupancy
  if (G.board.vertices[vertexId]) {
    return 'INVALID_MOVE'; // Already occupied
  }

  // 2. Validation: Distance Rule
  // We need to parse the vertexId back to coords or neighbors.
  // The vertexId format is "q,r,s::q,r,s::q,r,s" (sorted).
  // Actually, finding neighbors of a vertex in this ID format is tricky without a helper.
  // However, `G.board.vertices` stores all placed settlements.
  // We can iterate all placed settlements and check distance to the candidate `vertexId`.
  // Distance between two vertices is 0 if they share an edge? No.
  // Vertices are adjacent if they share an edge.
  // In Cube coords, vertices are "corners".
  // Let's implement a `areVerticesAdjacent` helper or similar logic.

  // Wait, I need a robust way to check adjacency of vertices.
  // A vertex is defined by 3 hexes (or 2/1 on edges).
  // Two vertices are adjacent if they share 2 hexes.

  // Let's defer strict Distance Rule implementation detail to a helper function logic inside the move for now.
  // A simpler check: Parse the vertexId. It contains 3 coords.
  // An adjacent vertex will share exactly 2 of those coords?
  // Let's look at `hexUtils.ts` again.

  // ... (Self-correction: I'll need to implement `getVertexNeighbors` in `hexUtils` or here).
  // For now, I'll assume `getVertexNeighbors(vertexId)` exists or I implement it.

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
  G.lastPlacedSettlement = vertexId;

  // Resource Grant (Round 2 Only)
  // We need to know if we are in Round 2.
  // The Snake Draft is 0..N-1, then N-1..0.
  // Total turns = 2 * N.
  // Round 2 is the second half.
  // `ctx.turn` is global turn count? Or phase turn count? `ctx.turn` increments every MOVE in default, but here we define custom order.
  // boardgame.io `ctx.turn` is 1-based.
  // For 4 players: Turns 1,2,3,4 (Round 1). Turns 5,6,7,8 (Round 2).
  // So if `ctx.turn > numPlayers`, we are in round 2.
  // Actually, strictly speaking `ctx.turn` counts distinct turns.
  // Let's use `setupPhase.activeRound` or infer from `G.players[ctx.currentPlayer].settlements.length`.
  // If player already has 1 settlement before this move? No, we just pushed it.
  // So if settlements.length === 2, it's the second one.

  // Update active round based on settlement count (proxy)
  // If this is the second settlement for this player, we are in round 2 for them.
  // Actually, we want to track the global phase round?
  // The snake draft goes 0..3 (Round 1), 3..0 (Round 2).
  // If we want G.setupPhase.activeRound to be accurate globally:
  // It should flip to 2 when the last player of Round 1 finishes their turn?
  // But snake draft for 4 players: 0, 1, 2, 3, 3, 2, 1, 0.
  // Turn 4 (index 3) is Player 3. Turn 5 (index 4) is Player 3.
  // So strictly, Round 2 starts at turn 5.
  // But G.setupPhase.activeRound is just metadata.
  // Let's rely on the turn number.
  // totalPlayers * 1 = End of Round 1.
  // We can check ctx.turn (1-based index of turns taken).
  // If (ctx.turn - 1) / numPlayers >= 1 ...
  // But we don't have numPlayers easily here without Object.keys(G.players).

  const numPlayers = Object.keys(G.players).length;
  // This move is happening. ctx.turn will increment after.
  // Currently ctx.turn starts at 1.
  // After 4 moves (1,2,3,4), round 1 is done.
  // So if ctx.turn >= numPlayers, next move starts round 2?
  // Let's just set it based on current turn.
  if (ctx.turn >= numPlayers && G.setupPhase.activeRound === 1) {
      G.setupPhase.activeRound = 2;
  }

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
            // @ts-ignore
            G.players[ctx.currentPlayer].resources[res]++;
          }
      }
    });
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
  // Must connect to G.lastPlacedSettlement
  if (!G.lastPlacedSettlement) {
      return 'INVALID_MOVE'; // Should not happen in flow
  }

  const connectedEdges = getEdgesForVertex(G.lastPlacedSettlement);
  if (!connectedEdges.includes(edgeId)) {
      return 'INVALID_MOVE';
  }

  // Execution
  G.board.edges[edgeId] = { owner: ctx.currentPlayer };
  G.players[ctx.currentPlayer].roads.push(edgeId);
  G.lastPlacedSettlement = null; // Reset

  // State Transition
  if (events && events.endTurn) {
      events.endTurn();
  }
};


// --- Helpers (Should probably be in hexUtils but implementing here for now to ensure self-contained move logic or I'll move them later) ---

// A vertex ID is "q,r,s::q,r,s::q,r,s".
// We need to parse it.
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
       const vA = getVerticesForHex(pair[0]); // Returns string IDs
       const vB = getVerticesForHex(pair[1]);
       // intersection
       const common = vA.filter(id => vB.includes(id));
       // common should be [vertexId, neighborId]
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
    // Edges connected to a vertex (H1, H2, H3) are (H1,H2), (H2,H3), (H3,H1).
    const hexes = parseVertexId(vertexId);
    return [
        getEdgeId(hexes[0], hexes[1]),
        getEdgeId(hexes[1], hexes[2]),
        getEdgeId(hexes[2], hexes[0])
    ];
}
