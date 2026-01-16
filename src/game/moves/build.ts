import { Move } from 'boardgame.io';
import { GameState } from '../types';
import { getEdgesForVertex, getVerticesForEdge } from '../hexUtils';
import { BUILD_COSTS } from '../config';
import { isValidHexId } from '../../utils/validation';
import { RuleEngine } from '../rules/validator';

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
    // 0. Security Validation
    if (!isValidHexId(edgeId)) {
        throw new Error("Invalid edge ID format");
    }

    const player = G.players[ctx.currentPlayer];
    const cost = BUILD_COSTS.road;

    // 1. Delegate Validation to Rule Engine
    RuleEngine.validateMoveOrThrow(G, ctx, 'buildRoad', [edgeId]);

    // Execution
    // eslint-disable-next-line security/detect-object-injection
    G.board.edges[edgeId] = { owner: ctx.currentPlayer };
    player.roads.push(edgeId);
    player.resources.wood -= cost.wood;
    player.resources.brick -= cost.brick;
};

export const buildSettlement: Move<GameState> = ({ G, ctx }, vertexId: string) => {
    // 0. Security Validation
    if (!isValidHexId(vertexId)) {
        throw new Error("Invalid vertex ID format");
    }

    const player = G.players[ctx.currentPlayer];
    const cost = BUILD_COSTS.settlement;

    // 1. Delegate Validation to Rule Engine
    RuleEngine.validateMoveOrThrow(G, ctx, 'buildSettlement', [vertexId]);

    // Execution
    // eslint-disable-next-line security/detect-object-injection
    G.board.vertices[vertexId] = { owner: ctx.currentPlayer, type: 'settlement' };
    player.settlements.push(vertexId);
    player.victoryPoints += 1;
    player.resources.wood -= cost.wood;
    player.resources.brick -= cost.brick;
    player.resources.wheat -= cost.wheat;
    player.resources.sheep -= cost.sheep;
};

export const buildCity: Move<GameState> = ({ G, ctx }, vertexId: string) => {
    // 0. Security Validation
    if (!isValidHexId(vertexId)) {
        throw new Error("Invalid vertex ID format");
    }

    const player = G.players[ctx.currentPlayer];
    const cost = BUILD_COSTS.city;

    // 1. Delegate Validation to Rule Engine
    RuleEngine.validateMoveOrThrow(G, ctx, 'buildCity', [vertexId]);

    // Execution
    // eslint-disable-next-line security/detect-object-injection
    const vertex = G.board.vertices[vertexId];
    if (vertex) {
        vertex.type = 'city';
    }
    player.victoryPoints += 1; // 1 (settlement) -> 2 (city), so +1
    player.resources.ore -= cost.ore;
    player.resources.wheat -= cost.wheat;
};

export const endTurn: Move<GameState> = ({ events }) => {
    if (events && events.endTurn) {
        events.endTurn();
    }
};
