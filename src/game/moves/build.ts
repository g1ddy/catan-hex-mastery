import { Move } from 'boardgame.io';
import { GameState } from '../types';
import { getEdgesForVertex, getVerticesForEdge } from '../hexUtils';

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
    const player = G.players[ctx.currentPlayer];

    // 1. Cost Check
    if (player.resources.wood < 1 || player.resources.brick < 1) {
        return 'INVALID_MOVE';
    }

    // 2. Validation: Occupancy
    if (G.board.edges[edgeId]) {
        return 'INVALID_MOVE';
    }

    // 3. Validation: Connection
    const endpoints = getVerticesForEdge(edgeId);
    let connected = false;

    for (const vId of endpoints) {
        // Check for own building (settlement/city)
        const building = G.board.vertices[vId];
        if (building && building.owner === ctx.currentPlayer) {
            connected = true;
            break;
        }

        // Check for own roads connected to this vertex
        // Rule: You can build from your road unless an opponent's building is on that vertex.
        if (building && building.owner !== ctx.currentPlayer) {
            // Opponent building blocks road connection
            continue;
        }

        const adjEdges = getEdgesForVertex(vId);
        for (const adjEdgeId of adjEdges) {
            if (adjEdgeId === edgeId) continue;
            const edge = G.board.edges[adjEdgeId];
            if (edge && edge.owner === ctx.currentPlayer) {
                connected = true;
                break;
            }
        }
        if (connected) break;
    }

    if (!connected) return 'INVALID_MOVE';

    // Execution
    G.board.edges[edgeId] = { owner: ctx.currentPlayer };
    player.roads.push(edgeId);
    player.resources.wood--;
    player.resources.brick--;
};

export const buildSettlement: Move<GameState> = ({ G, ctx }, vertexId: string) => {
    const player = G.players[ctx.currentPlayer];

    // 1. Cost Check
    if (player.resources.wood < 1 || player.resources.brick < 1 || player.resources.wheat < 1 || player.resources.sheep < 1) {
        return 'INVALID_MOVE';
    }

    // 2. Validation: Occupancy
    if (G.board.vertices[vertexId]) {
        return 'INVALID_MOVE';
    }

    // 3. Validation: Distance Rule
    const neighbors = getVertexNeighbors(vertexId);
    for (const nId of neighbors) {
        if (G.board.vertices[nId]) {
            return 'INVALID_MOVE';
        }
    }

    // 4. Validation: Connection to own road
    const adjEdges = getEdgesForVertex(vertexId);
    const hasOwnRoad = adjEdges.some(eId => {
        const edge = G.board.edges[eId];
        return edge && edge.owner === ctx.currentPlayer;
    });

    if (!hasOwnRoad) return 'INVALID_MOVE';

    // Execution
    G.board.vertices[vertexId] = { owner: ctx.currentPlayer, type: 'settlement' };
    player.settlements.push(vertexId);
    player.victoryPoints += 1;
    player.resources.wood--;
    player.resources.brick--;
    player.resources.wheat--;
    player.resources.sheep--;
};

export const buildCity: Move<GameState> = ({ G, ctx }, vertexId: string) => {
    const player = G.players[ctx.currentPlayer];

    // 1. Cost Check
    if (player.resources.ore < 3 || player.resources.wheat < 2) {
        return 'INVALID_MOVE';
    }

    // 2. Validation: Must be own settlement
    const vertex = G.board.vertices[vertexId];
    if (!vertex || vertex.owner !== ctx.currentPlayer || vertex.type !== 'settlement') {
        return 'INVALID_MOVE';
    }

    // Execution
    vertex.type = 'city';
    player.victoryPoints += 1; // 1 (settlement) -> 2 (city), so +1
    player.resources.ore -= 3;
    player.resources.wheat -= 2;
};

export const endTurn: Move<GameState> = ({ events }) => {
    if (events && events.endTurn) {
        events.endTurn();
    }
};
