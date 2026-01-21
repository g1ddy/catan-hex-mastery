import { Move } from 'boardgame.io';
import { GameState, TerrainType } from '../types';
import { STAGES } from '../constants';
import { getHexesForVertex } from '../hexUtils';
import { isValidHexId } from '../../utils/validation';
import { TERRAIN_TO_RESOURCE } from '../mechanics/resources';
import { RuleEngine } from '../rules/validator';
import { generateBoard } from '../boardGen';
import { calculateBoardStats } from '../analysis/analyst';
import { safeSet, safeGet } from '../../utils/objectUtils';

export const placeSettlement: Move<GameState> = ({ G, ctx, events }, vertexId: string) => {

  // 0. Security Validation
  if (!isValidHexId(vertexId)) {
    throw new Error("Invalid vertex ID format");
  }

  // 1. Delegate Validation to Rule Engine
  RuleEngine.validateMoveOrThrow(G, ctx, 'placeSettlement', [vertexId]);

  // Execution
  safeSet(G.board.vertices, vertexId, { owner: ctx.currentPlayer, type: 'settlement' });
  G.players[ctx.currentPlayer].settlements.push(vertexId);
  G.players[ctx.currentPlayer].victoryPoints += 1; // Settlement worth 1 VP

  // Resource Grant (Round 2 Only)
  // Check if this is the second settlement for this player
  if (G.players[ctx.currentPlayer].settlements.length === 2) {
    // Grant resources
    const touchingHexes = getHexesForVertex(vertexId);
    touchingHexes.forEach(hId => {
      const hex = safeGet(G.board.hexes, hId);
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

  // 1. Delegate Validation to Rule Engine
  RuleEngine.validateMoveOrThrow(G, ctx, 'placeRoad', [edgeId]);

  // Execution
  safeSet(G.board.edges, edgeId, { owner: ctx.currentPlayer });
  G.players[ctx.currentPlayer].roads.push(edgeId);

  // State Transition
  if (events && events.endTurn) {
      events.endTurn();
  }
};

export const regenerateBoard: Move<GameState> = ({ G }) => {
    // SECURITY: Prevent board regeneration if any pieces have been placed
    const anyPiecePlaced = Object.values(G.players).some(p => p.settlements.length > 0 || p.roads.length > 0);
    if (anyPiecePlaced) {
        return 'INVALID_MOVE';
    }

    const { hexes, ports } = generateBoard();
    G.board.hexes = hexes;
    G.board.ports = ports;
    G.boardStats = calculateBoardStats(hexes);

    // Fix: Update Robber location to new Desert
    const desertHex = Object.values(hexes).find(h => h.terrain === TerrainType.Desert);
    if (!desertHex) {
        throw new Error('Board generation failed: Desert hex not found.');
    }
    G.robberLocation = desertHex.id;
};
