import { Move } from 'boardgame.io';
import { GameState } from '../types';
import { BUILD_COSTS } from '../config';
import { isValidHexId } from '../../utils/validation';
import { RuleEngine } from '../rules/validator';

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
    G.board.edges.set(edgeId, { owner: ctx.currentPlayer });
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
    G.board.vertices.set(vertexId, { owner: ctx.currentPlayer, type: 'settlement' });
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
    const vertex = G.board.vertices.get(vertexId);
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
