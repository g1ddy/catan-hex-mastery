import { Move } from 'boardgame.io';
import { GameState } from '../types';
import { getEdgesForVertex, getVerticesForEdge } from '../hexUtils';
import { BUILD_COSTS } from '../config';
import { isValidHexId } from '../../utils/validation';

// Helper to find neighboring vertices (distance rule)
const getVertexNeighbors = (vertexId: string): string[] => {
    const edges = getEdgesForVertex(vertexId);
    // Each edge connects to 2 vertices. One is vertexId, the other is the neighbor.
    // Use a Set to avoid duplicates if any (though structurally unlikely in hex grid).
    const neighbors = new Set<string>();

    for (const eId of edges) {
        const vertices = getVerticesForEdge(eId);
        for (const v of vertices) {
            if (v !== vertexId) {
                neighbors.add(v);
            }
        }
    }
    return Array.from(neighbors);
};

export const buildRoad: Move<GameState> = ({ G, ctx }, edgeId: string) => {
    if (!isValidHexId(edgeId)) {
        throw new Error("Invalid edge ID");
    }

    const player = G.players[ctx.currentPlayer];
    const cost = BUILD_COSTS.road;

    // 1. Cost Check
    if (player.resources.wood < cost.wood || player.resources.brick < cost.brick) {
        throw new Error("Not enough resources to build a road (requires Wood, Brick)");
    }

    // 2. Validation: Occupancy
    if (G.board.edges[edgeId]) {
        throw new Error("This edge is already occupied");
    }

    // 3. Validation: Connection
    const endpoints = getVerticesForEdge(edgeId);

    const hasConnection = (vId: string): boolean => {
        const building = G.board.vertices[vId];
        // Connected to own settlement/city
        if (building && building.owner === ctx.currentPlayer) {
            return true;
        }
        // Blocked by opponent's settlement/city
        if (building && building.owner !== ctx.currentPlayer) {
            return false;
        }
        // Connected to own road
        const adjEdges = getEdgesForVertex(vId);
        return adjEdges.some(adjEdgeId => {
            if (adjEdgeId === edgeId) return false;
            const edge = G.board.edges[adjEdgeId];
            return edge && edge.owner === ctx.currentPlayer;
        });
    };

    if (!endpoints.some(hasConnection)) throw new Error("Road must connect to your existing road or settlement");

    // Execution
    G.board.edges[edgeId] = { owner: ctx.currentPlayer };
    player.roads.push(edgeId);
    player.resources.wood -= cost.wood;
    player.resources.brick -= cost.brick;
};

export const buildSettlement: Move<GameState> = ({ G, ctx }, vertexId: string) => {
    if (!isValidHexId(vertexId)) {
        throw new Error("Invalid vertex ID");
    }

    const player = G.players[ctx.currentPlayer];
    const cost = BUILD_COSTS.settlement;

    // 1. Cost Check
    if (player.resources.wood < cost.wood ||
        player.resources.brick < cost.brick ||
        player.resources.wheat < cost.wheat ||
        player.resources.sheep < cost.sheep) {
        throw new Error("Not enough resources to build a settlement (requires Wood, Brick, Wheat, Sheep)");
    }

    // 2. Validation: Occupancy
    if (G.board.vertices[vertexId]) {
        throw new Error("This vertex is already occupied");
    }

    // 3. Validation: Distance Rule
    const neighbors = getVertexNeighbors(vertexId);
    for (const nId of neighbors) {
        if (G.board.vertices[nId]) {
            throw new Error("Settlement is too close to another building (Distance Rule)");
        }
    }

    // 4. Validation: Connection to own road
    const adjEdges = getEdgesForVertex(vertexId);
    const hasOwnRoad = adjEdges.some(eId => {
        const edge = G.board.edges[eId];
        return edge && edge.owner === ctx.currentPlayer;
    });

    if (!hasOwnRoad) throw new Error("Settlement must connect to your own road");

    // Execution
    G.board.vertices[vertexId] = { owner: ctx.currentPlayer, type: 'settlement' };
    player.settlements.push(vertexId);
    player.victoryPoints += 1;
    player.resources.wood -= cost.wood;
    player.resources.brick -= cost.brick;
    player.resources.wheat -= cost.wheat;
    player.resources.sheep -= cost.sheep;
};

export const buildCity: Move<GameState> = ({ G, ctx }, vertexId: string) => {
    if (!isValidHexId(vertexId)) {
        throw new Error("Invalid vertex ID");
    }

    const player = G.players[ctx.currentPlayer];
    const cost = BUILD_COSTS.city;

    // 1. Cost Check
    if (player.resources.ore < cost.ore || player.resources.wheat < cost.wheat) {
        throw new Error("Not enough resources to build a city (requires 3 Ore, 2 Wheat)");
    }

    // 2. Validation: Must be own settlement
    const vertex = G.board.vertices[vertexId];
    if (!vertex || vertex.owner !== ctx.currentPlayer || vertex.type !== 'settlement') {
        throw new Error("You can only upgrade your own settlements to cities");
    }

    // Execution
    vertex.type = 'city';
    player.victoryPoints += 1; // 1 (settlement) -> 2 (city), so +1
    player.resources.ore -= cost.ore;
    player.resources.wheat -= cost.wheat;
};

export const endTurn: Move<GameState> = ({ events }) => {
    if (events && events.endTurn) {
        events.endTurn();
    }
};
