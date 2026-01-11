import { Move } from 'boardgame.io';
import { GameState } from '../types';
import { STAGES } from '../constants';
import { getHexesForVertex } from '../hexUtils';
import { isValidSetupRoadPlacement, validateSettlementLocation } from '../rules/placement';
import { isValidHexId } from '../../utils/validation';
import { TERRAIN_TO_RESOURCE } from '../mechanics/resources';

export const placeSettlement: Move<GameState> = ({ G, ctx, events }, vertexId: string) => {

  // 0. Security Validation
  if (!isValidHexId(vertexId)) {
    throw new Error("Invalid vertex ID format");
  }

  // 1. Validation: Occupancy & Distance Rule
  const validation = validateSettlementLocation(G, vertexId);
  if (!validation.isValid) {
    throw new Error(validation.reason || "Invalid settlement placement");
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
  // Use centralized validation logic.
  // This function checks for both occupancy and connectivity to the last placed settlement.
  const validation = isValidSetupRoadPlacement(G, edgeId, ctx.currentPlayer);
  if (!validation.isValid) {
    throw new Error(validation.reason || "Invalid road placement: The edge may be occupied or not connected to your last settlement.");
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
