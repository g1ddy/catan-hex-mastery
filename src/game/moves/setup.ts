import { Move } from 'boardgame.io';
import { GameState, TerrainType } from '../types';
import { getEdgeId, getVertexNeighbors, parseVertexId } from '../hexUtils';
import { evaluatePlacement } from '../analysis/coach';

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

  // Analysis / Coach Feedback (Run BEFORE updating state to match logic in coach.ts)
  // Actually, evaluatePlacement is designed to run *after* validity checks but *before* the board is modified
  // to properly compare "User Score" vs "Best Other Scores".
  // WAIT: My implementation of `evaluatePlacement` calculates `userScore` assuming it's a valid spot.
  // And `getBestPlacements` ignores occupied spots.
  // If I run it BEFORE placing, `vertexId` is NOT occupied.
  // So `getBestPlacements` WILL include `vertexId`.
  // This simplifies things!
  // If `getBestPlacements` returns `vertexId` as #1, then `maxScore` == `userScore`.
  // If I run it AFTER placing, `vertexId` is occupied, so `getBestPlacements` returns alternatives.
  // The logic in `evaluatePlacement` assumes it calculates `userScore` and compares with `bestAlternatives`.
  // Let's check `coach.ts` again.
  // `getBestPlacements(G)` filters out invalid spots. If we run it BEFORE placement, `vertexId` is valid.
  // So `vertexId` will likely be in the list.
  // So `evaluatePlacement` logic needs to be mindful of this.
  // My `evaluatePlacement` implementation:
  // 1. Calculates `userScore`.
  // 2. Calls `getBestPlacements(G)`.
  // 3. Compares.
  // If I run BEFORE placement: `bestAlternatives` will contain `vertexId` (with score == userScore).
  // So `maxPossibleScore` will be `userScore` (or higher if user picked suboptimally).
  // This works perfectly.

  G.lastFeedback = evaluatePlacement(G, vertexId);

  // Execution
  G.board.vertices[vertexId] = { owner: ctx.currentPlayer, type: 'settlement' };
  G.players[ctx.currentPlayer].settlements.push(vertexId);
  G.players[ctx.currentPlayer].victoryPoints += 1; // Settlement worth 1 VP
  G.lastPlacedSettlement = vertexId;

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
            // @ts-ignore
            G.players[ctx.currentPlayer].resources[res]++;
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


// --- Helpers ---

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
