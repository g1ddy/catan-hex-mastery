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
import { getSettlementExpectedProduction } from './probability';

/** Calculates cube-coordinate distance between two hex coordinates. */
export function getCubeDistance(a: CubeCoordinates, b: CubeCoordinates): number {
  return getDistance(a, b);
}

function validateRadius(radius: number): void {
  if (!Number.isFinite(radius) || !Number.isInteger(radius) || radius < 0) {
    throw new Error(`Invalid radius '${radius}'. Radius must be a non-negative finite integer.`);
  }
}

/**
 * Returns all hex coordinates within a given radius (inclusive) of a center hex.
 * Result is ordered deterministically by q, then r, then s.
 */
export function getHexesInRadius(center: CubeCoordinates, radius: number): CubeCoordinates[] {
  validateRadius(radius);
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
  validateRadius(radius);
  if (radius === 0) return [center];
  const allInRadius = getHexesInRadius(center, radius);
  return allInRadius.filter((coords) => getDistance(center, coords) === radius);
}

/**
 * Low-level topology query: Returns all vertex IDs reachable via graph traversal over a player's connected road network.
 * Traversal starts at player structures (settlements/cities) or starting road endpoints if no structures exist.
 * Traversal expands along player-owned edges and halts at vertices occupied by opponent structures.
 * Includes occupied structures and cutoff vertices. Stably sorted.
 */
export function getPlayerRoadConnectedVertices(G: GameState, playerID: string): string[] {
  const player = safeGet(G.players, playerID);
  if (!player) return [];

  const visited = new Set<string>();
  const queue: string[] = [];

  // Seed graph traversal starting at player structures
  for (const vId of player.settlements) {
    visited.add(vId);
    queue.push(vId);
  }

  // Fallback if player has no settlements/cities placed yet but has roads (e.g. custom test setup)
  if (queue.length === 0 && player.roads.length > 0) {
    const firstRoad = player.roads[0];
    for (const vId of getVerticesForEdge(firstRoad)) {
      visited.add(vId);
      queue.push(vId);
    }
  }

  while (queue.length > 0) {
    const currentVertexId = queue.shift()!;
    const vertex = safeGet(G.board.vertices, currentVertexId);

    // Opponent building cuts off road network pass-through (unless it's the start node)
    if (vertex && vertex.owner !== playerID) {
      continue;
    }

    const adjEdges = getEdgesForVertex(currentVertexId);
    for (const edgeId of adjEdges) {
      const edge = safeGet(G.board.edges, edgeId);
      if (edge && edge.owner === playerID) {
        const endpoints = getVerticesForEdge(edgeId);
        for (const nextVId of endpoints) {
          if (!visited.has(nextVId)) {
            visited.add(nextVId);
            queue.push(nextVId);
          }
        }
      }
    }
  }

  return Array.from(visited).sort();
}

/**
 * Domain expansion query: Returns unoccupied road-connected vertices suitable for settlement expansion.
 * Delegates legal placement checks directly to authoritative rule queries (`getValidSettlementSpots`).
 * Stably sorted.
 */
export function getPlayerRoadExpansionCandidates(
  G: GameState,
  playerID: string,
  checkCost = false
): string[] {
  const validSpots = getValidSettlementSpots(G, playerID, checkCost);
  const connected = getPlayerRoadConnectedVertices(G, playerID);
  const candidates = connected.filter((vId) => validSpots.has(vId));
  return candidates.sort();
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

export interface OpponentRoadFact {
  edgeId: string;
  owner: string;
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

/**
 * Returns opponent roads that are directly adjacent (connected by edge) to the given location.
 */
export function getOpponentAdjacentRoads(
  G: GameState,
  vertexId: string,
  playerID?: string
): OpponentRoadFact[] {
  const adjEdges = getEdgesForVertex(vertexId);
  const facts: OpponentRoadFact[] = [];

  for (const eId of adjEdges) {
    const edge = safeGet(G.board.edges, eId);
    if (edge && (!playerID || edge.owner !== playerID)) {
      facts.push({
        edgeId: eId,
        owner: edge.owner,
      });
    }
  }

  return facts.sort((a, b) => a.edgeId.localeCompare(b.edgeId));
}

export interface CandidateSpatialSummary {
  vertexId: string;
  adjacentHexes: string[];
  adjacentOpponentStructures: OpponentStructureFact[];
  adjacentOpponentRoads: OpponentRoadFact[];
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
  const adjacentOpponentRoads = getOpponentAdjacentRoads(G, vertexId, playerID);
  const ports = getNearbyPortsForVertex(G, vertexId);
  const expectedProduction = getSettlementExpectedProduction(G, vertexId);

  return {
    vertexId,
    adjacentHexes,
    adjacentOpponentStructures: adjacentOpponents,
    adjacentOpponentRoads,
    expectedProduction,
    ports,
  };
}
