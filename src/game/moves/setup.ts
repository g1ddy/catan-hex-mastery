import { Move } from 'boardgame.io';
import { GameState } from '../types';
import { STAGES } from '../constants';
import { getVertexNeighbors, getHexesForVertex, getEdgesForVertex } from '../hexUtils';
import { isValidHexId } from '../../utils/validation';
import { isValidSetupRoadPlacement } from '../rules/placement';
import { TERRAIN_TO_RESOURCE } from '../mechanics/resources';

export const placeSettlement: Move<GameState> = ({ G, ctx, events }, vertexId: string) => {
  // 0. Security Validation
  if (!isValidHexId(vertexId)) {
    throw new Error("Invalid vertex ID format");
  }

  // 1. Validation: Occupancy
  // eslint-disable-next-line security/detect-object-injection
  if (G.board.vertices[vertexId]) {
    throw new Error("This vertex is already occupied");
  }

  // 2. Validation: Distance Rule
  // Implementation of Occupancy check:
  const neighbors = getVertexNeighbors(vertexId);
  for (const nId of neighbors) {
    // eslint-disable-next-line security/detect-object-injection
    if (G.board.vertices[nId]) {
      throw new Error("Settlement is too close to another building");
    }
  }

  // Execution
  // eslint-disable-next-line security/detect-object-injection
  G.board.vertices[vertexId] = { owner: ctx.currentPlayer, type: 'settlement' };
  G.players[ctx.currentPlayer].settlements.push(vertexId);
  G.players[ctx.currentPlayer].victoryPoints += 1; // Settlement worth 1 VP

  // Resource Grant (Round 2 Only)
  // Check if this is the second settlement for this player
  if (G.players[ctx.currentPlayer].settlements.length === 2) {
    // Grant resources
    const touchingHexes = getHexesForVertex(vertexId);
    touchingHexes.forEach(hId => {
      // eslint-disable-next-line security/detect-object-injection
      const hex = G.board.hexes[hId];
      if (hex) {
          const res = TERRAIN_TO_RESOURCE[hex.terrain];
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
  // 0. Security Validation
  if (!isValidHexId(edgeId)) {
    throw new Error("Invalid edge ID format");
  }

  // Use centralized validation logic
  if (!isValidSetupRoadPlacement(G, edgeId, ctx.currentPlayer)) {
      // If valid, it might be due to occupancy or connectivity.
      // We reconstruct the error message for better feedback, or the UI handles it.
      // For now, to keep test expectations satisfied, we check specifically:

      // Check Occupancy
      // eslint-disable-next-line security/detect-object-injection
      if (G.board.edges[edgeId]) {
          throw new Error("This edge is already occupied");
      }

      // Check Connectivity
      const lastSettlementId = G.players[ctx.currentPlayer].settlements.at(-1);
      if (!lastSettlementId) {
          throw new Error("No active settlement found to connect to");
      }

      const connectedEdges = getEdgesForVertex(lastSettlementId);
      if (!connectedEdges.includes(edgeId)) {
           throw new Error("Road must connect to your just-placed settlement");
      }

      // Fallback
      throw new Error("Invalid road placement");
  }

  // Execution
  // eslint-disable-next-line security/detect-object-injection
  G.board.edges[edgeId] = { owner: ctx.currentPlayer };
  G.players[ctx.currentPlayer].roads.push(edgeId);

  // State Transition
  if (events && events.endTurn) {
      events.endTurn();
  }
};
