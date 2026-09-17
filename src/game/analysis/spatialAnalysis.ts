import type { CubeCoordinates, GameState, Port } from '../core/types';
import {
  getDistance,
  getVertexNeighbors,
  getHexesForVertex,
  getVerticesForEdge,
  getEdgesForVertex,
} from '../geometry/hexUtils';
import { safeGet } from '../core/utils/objectUtils';
import {
  getValidSettlementSpots,
  getValidSetupSettlementSpots,
} from '../rules/queries';
import { getVertexExpectedProduction } from './probability';

/** Calculates cube-coordinate distance between two hex coordinates. */
export function getCubeDistance(a: CubeCoordinates, b: CubeCoordinates): number {
  return getDistance(a, b);
}

/**
 * Returns all hex coordinates within a given radius (inclusive) of a center hex.
 * Result is ordered deterministically by q, then r, then s.
 */
export function getHexesInRadius(center: CubeCoordinates, radius: number): CubeCoordinates[] {
  const result: CubeCoordinates[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      const s = -q - r;
      result.push({
        q: center.q + q,
        r: center.r + r,
        s: center.s + s,
      });
    }
  }
  return result.sort((a, b) => (a.q !== b.q ? a.q - b.q : a.r !== b.r ? a.r - b.r : a.s - b.s));
}

/**
 * Returns all hex coordinates exactly at a given ring radius from a center hex.
 * Result is ordered deterministically.
 */
export function getHexesInRing(center: CubeCoordinates, radius: number): CubeCoordinates[] {
  if (radius <= 0) return [center];
  const allInRadius = getHexesInRadius(center, radius);
  return allInRadius.filter((coords) => getDistance(center, coords) === radius);
}

/**
 * Returns all vertex IDs reachable/connected via a player's road network.
 * Stably sorted.
 */
export function getPlayerRoadConnectedVertices(G: GameState, playerID: string): string[] {
  const player = safeGet(G.players, playerID);
  if (!player) return [];

  const vertices = new Set<string>();
  for (const roadId of player.roads) {
    for (const vId of getVerticesForEdge(roadId)) {
      vertices.add(vId);
    }
  }
  return Array.from(vertices).sort();
}

/**
 * Delegated legal query: Returns open legal settlement candidates for the gameplay phase.
 * Stably sorted.
 */
export function getLegalSettlementCandidates(
  G: GameState,
  playerID: string,
  checkCost = false
): string[] {
  const spots = getValidSettlementSpots(G, playerID, checkCost);
  return Array.from(spots).sort();
}

/**
 * Delegated legal query: Returns open legal setup settlement candidates.
 * Stably sorted.
 */
export function getLegalSetupSettlementCandidates(G: GameState): string[] {
  const spots = getValidSetupSettlementSpots(G);
  return Array.from(spots).sort();
}

/**
 * Returns ports that a player actually accesses (player has a settlement or city on port vertices).
 * Stably sorted by port edge ID / type.
 */
export function getPlayerAccessedPorts(G: GameState, playerID: string): Port[] {
  const player = safeGet(G.players, playerID);
  if (!player) return [];

  const ports = Object.values(G.board.ports || {});
  const accessed = ports.filter((port) =>
    port.vertices.some((vId) => player.settlements.includes(vId))
  );

  return accessed.sort((a, b) => a.edgeId.localeCompare(b.edgeId));
}

/**
 * Returns ports adjacent to or touching a specific vertex ID.
 * Distinct from whether a player's structure currently occupies that port.
 */
export function getNearbyPortsForVertex(G: GameState, vertexId: string): Port[] {
  const ports = Object.values(G.board.ports || {});
  const nearby = ports.filter((port) => port.vertices.includes(vertexId));
  return nearby.sort((a, b) => a.edgeId.localeCompare(b.edgeId));
}

export interface OpponentStructureFact {
  vertexId: string;
  owner: string;
  type: 'settlement' | 'city';
}

/**
 * Returns opponent structures that are direct vertex neighbors of the given location.
 */
export function getOpponentAdjacentStructures(
  G: GameState,
  vertexId: string,
  playerID?: string
): OpponentStructureFact[] {
  const neighbors = getVertexNeighbors(vertexId);
  const facts: OpponentStructureFact[] = [];

  for (const nId of neighbors) {
    const vertex = safeGet(G.board.vertices, nId);
    if (vertex && (!playerID || vertex.owner !== playerID)) {
      facts.push({
        vertexId: nId,
        owner: vertex.owner,
        type: vertex.type,
      });
    }
  }

  return facts.sort((a, b) => a.vertexId.localeCompare(b.vertexId));
}

export interface CandidateSpatialSummary {
  vertexId: string;
  adjacentHexes: string[];
  adjacentOpponentStructures: OpponentStructureFact[];
  /** True if an opponent structure is adjacent or opponent road leads directly to this vertex. */
  isContested: boolean;
  expectedProduction: number;
  ports: Port[];
}

/**
 * Computes descriptive spatial facts and opportunity metrics for a candidate vertex location.
 */
export function getCandidateSpatialSummary(
  G: GameState,
  vertexId: string,
  playerID?: string
): CandidateSpatialSummary {
  const adjacentHexes = getHexesForVertex(vertexId).sort();
  const adjacentOpponents = getOpponentAdjacentStructures(G, vertexId, playerID);
  const ports = getNearbyPortsForVertex(G, vertexId);
  const expectedProduction = getVertexExpectedProduction(G, vertexId);

  // Check if contested by opponent roads
  const adjEdges = getEdgesForVertex(vertexId);
  let isContested = adjacentOpponents.length > 0;
  if (!isContested && playerID) {
    for (const eId of adjEdges) {
      const edge = safeGet(G.board.edges, eId);
      if (edge && edge.owner !== playerID) {
        isContested = true;
        break;
      }
    }
  }

  return {
    vertexId,
    adjacentHexes,
    adjacentOpponentStructures: adjacentOpponents,
    isContested,
    expectedProduction,
    ports,
  };
}
