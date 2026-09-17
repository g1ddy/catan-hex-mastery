import {
  getCubeDistance,
  getHexesInRadius,
  getHexesInRing,
  getPlayerRoadConnectedVertices,
  getLegalSettlementCandidates,
  getPlayerAccessedPorts,
  getNearbyPortsForVertex,
  getOpponentAdjacentStructures,
  getCandidateSpatialSummary,
} from './spatialAnalysis';
import { TerrainType, Port } from '../core/types';
import { createMockGameState, createTestPlayer } from '../testUtils';
import { getVertexNeighbors } from '../geometry/hexUtils';

describe('spatial analysis domain primitives', () => {
  it('calculates cube coordinate distance correctly', () => {
    const origin = { q: 0, r: 0, s: 0 };
    const near = { q: 1, r: -1, s: 0 };
    const far = { q: 2, r: -1, s: -1 };

    expect(getCubeDistance(origin, origin)).toBe(0);
    expect(getCubeDistance(origin, near)).toBe(1);
    expect(getCubeDistance(origin, far)).toBe(2);
  });

  it('computes hexes in radius and ring deterministically', () => {
    const center = { q: 0, r: 0, s: 0 };
    const radius1 = getHexesInRadius(center, 1);
    expect(radius1).toHaveLength(7); // center + 6 neighbors

    const ring1 = getHexesInRing(center, 1);
    expect(ring1).toHaveLength(6); // 6 neighbors

    const ring2 = getHexesInRing(center, 2);
    expect(ring2).toHaveLength(12);
  });

  it('identifies player road connected vertices and legal settlement candidates', () => {
    const G = createMockGameState();
    const p0 = createTestPlayer('0');
    const edgeId = '0,0,0::1,-1,0';
    p0.roads = [edgeId];
    G.players['0'] = p0;

    const vertices = getPlayerRoadConnectedVertices(G, '0');
    expect(vertices).toEqual(['0,-1,1::0,0,0::1,-1,0', '0,0,0::1,-1,0::1,0,-1'].sort());

    const candidates = getLegalSettlementCandidates(G, '0', false);
    expect(Array.isArray(candidates)).toBe(true);
  });

  it('distinguishes player accessed ports from nearby port locations', () => {
    const port1: Port = {
      type: '3:1',
      edgeId: '0,0,0::1,-1,0',
      vertices: ['v1', 'v2'],
    };
    const port2: Port = {
      type: 'ore',
      edgeId: '1,0,-1::0,1,-1',
      vertices: ['v3', 'v4'],
    };

    const G = createMockGameState();
    G.board.ports = {
      p1: port1,
      p2: port2,
    };

    // Player 0 built on v1 (port 1 vertex)
    const p0 = createTestPlayer('0');
    p0.settlements = ['v1'];
    G.players['0'] = p0;

    const accessed = getPlayerAccessedPorts(G, '0');
    expect(accessed).toHaveLength(1);
    expect(accessed[0].edgeId).toBe(port1.edgeId);

    // Vertex v3 has port 2 nearby, even if unbuilt
    const nearbyV3 = getNearbyPortsForVertex(G, 'v3');
    expect(nearbyV3).toHaveLength(1);
    expect(nearbyV3[0].type).toBe('ore');

    const nearbyUnconnected = getNearbyPortsForVertex(G, 'unconnected_vertex');
    expect(nearbyUnconnected).toHaveLength(0);
  });

  it('identifies opponent adjacent structures', () => {
    const G = createMockGameState();
    const vertexId = '0,0,0::1,-1,0::1,0,-1';
    const neighbors = getVertexNeighbors(vertexId);
    expect(neighbors.length).toBeGreaterThan(0);

    const neighborId = neighbors[0];
    G.board.vertices[neighborId] = { owner: '1', type: 'city' };

    const opponentFacts = getOpponentAdjacentStructures(G, vertexId, '0');
    expect(opponentFacts).toHaveLength(1);
    expect(opponentFacts[0].vertexId).toBe(neighborId);
    expect(opponentFacts[0].owner).toBe('1');
    expect(opponentFacts[0].type).toBe('city');
  });

  it('returns candidate spatial summary with production and port access', () => {
    const G = createMockGameState();
    const hex0 = {
      id: '0,0,0',
      coords: { q: 0, r: 0, s: 0 },
      terrain: TerrainType.Forest,
      tokenValue: 6,
    };
    const hex1 = {
      id: '1,-1,0',
      coords: { q: 1, r: -1, s: 0 },
      terrain: TerrainType.Hills,
      tokenValue: 5,
    };
    const hex2 = {
      id: '1,0,-1',
      coords: { q: 1, r: 0, s: -1 },
      terrain: TerrainType.Mountains,
      tokenValue: 8,
    };

    G.board.hexes['0,0,0'] = hex0;
    G.board.hexes['1,-1,0'] = hex1;
    G.board.hexes['1,0,-1'] = hex2;

    const vertexId = '0,0,0::1,-1,0::1,0,-1';

    const summary = getCandidateSpatialSummary(G, vertexId, '0');
    expect(summary.vertexId).toBe(vertexId);
    expect(summary.adjacentHexes).toEqual(['0,0,0', '1,-1,0', '1,0,-1']);
    expect(summary.expectedProduction).toBeCloseTo((5 + 4 + 5) / 36, 8);
    expect(summary.isContested).toBe(false);
  });
});
