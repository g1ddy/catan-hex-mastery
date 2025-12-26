import { Move } from 'boardgame.io';
import { GameState } from '../types';
import { getEdgesForVertex } from '../hexUtils';

export const buildRoad: Move<GameState> = ({ G, ctx, events }, edgeId: string) => {
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

// --- Local Helpers ---

function parseEdgeId(id: string) {
    return id.split('::').map(s => {
        const [q, r, sCoords] = s.split(',').map(Number);
        return { q, r, s: sCoords };
    });
}

function parseVertexId(id: string) {
    return id.split('::').map(s => {
        const [q, r, sCoords] = s.split(',').map(Number);
        return { q, r, s: sCoords };
    });
}

function getVerticesForEdge(edgeId: string): string[] {
    // Edge is between H1 and H2.
    // The two vertices are the ones shared by H1 and H2.
    // H1 and H2 share two neighbors: N1 and N2.
    // So vertices are (H1, H2, N1) and (H1, H2, N2).
    const [h1, h2] = parseEdgeId(edgeId);

    // Find common neighbors
    // Simple approach: get all neighbors of h1, check if they are neighbors of h2.
    // Or simpler: The "directions" around h1 that touch h2.
    // Cube coord math:
    // neighbors of h1.
    const h1Neighbors = [
        { q: h1.q+1, r: h1.r-1, s: h1.s }, { q: h1.q+1, r: h1.r, s: h1.s-1 },
        { q: h1.q, r: h1.r+1, s: h1.s-1 }, { q: h1.q-1, r: h1.r+1, s: h1.s },
        { q: h1.q-1, r: h1.r, s: h1.s+1 }, { q: h1.q, r: h1.r-1, s: h1.s+1 }
    ];
    // Filter neighbors that are also neighbors of h2 (dist(n, h2) == 1).
    // Actually, simple graph property: if h1 and h2 are neighbors, they share exactly two common neighbors in a hex grid.

    const common: any[] = [];
    h1Neighbors.forEach(n => {
        const dist = Math.max(Math.abs(n.q - h2.q), Math.abs(n.r - h2.r), Math.abs(n.s - h2.s));
        if (dist === 1) {
            common.push(n);
        }
    });

    if (common.length !== 2) {
        // Should not happen for valid edge
        return [];
    }

    // Construct vertex IDs: (h1, h2, common[0]) and (h1, h2, common[1])
    // We need a helper to sort and join them.
    // Re-implement getVertexId here or just use the sorting logic manually to avoid circular deps if importing from hexUtils fails (it shouldn't).
    // I'll assume I can duplicate the sort logic or just be careful.

    const sortAndJoin = (coords: any[]) => {
        const sorted = coords.sort((a, b) => {
            if (a.q !== b.q) return a.q - b.q;
            if (a.r !== b.r) return a.r - b.r;
            return a.s - b.s;
        });
        return sorted.map(c => `${c.q},${c.r},${c.s}`).join('::');
    };

    return [
        sortAndJoin([h1, h2, common[0]]),
        sortAndJoin([h1, h2, common[1]])
    ];
}

// Logic duplicated from moves/setup.ts (which wasn't exported)
function getVertexNeighbors(vertexId: string): string[] {
    const hexes = parseVertexId(vertexId);
    const neighbors: string[] = [];
    // Neighboring vertices share an edge.
    // Vertex is (H1, H2, H3).
    // Edges are (H1,H2), (H2,H3), (H3,H1).
    // For edge (H1,H2), the other vertex is (H1,H2,H4).
    // So we need to find H4 which is common neighbor of H1,H2 but not H3.

    const pairs = [
        [hexes[0], hexes[1]],
        [hexes[1], hexes[2]],
        [hexes[2], hexes[0]]
    ];

    pairs.forEach(pair => {
       // Find common neighbor of pair[0] and pair[1] that is NOT the third hex in 'hexes'.
       // We can use getVerticesForEdge logic essentially.
       const edgeV = getVerticesForEdge(getEdgeIdStr(pair[0], pair[1]));
       const n = edgeV.find(id => id !== vertexId);
       if (n) neighbors.push(n);
    });

    return neighbors;
}

function getEdgeIdStr(h1: any, h2: any): string {
    const sorted = [h1, h2].sort((a, b) => {
        if (a.q !== b.q) return a.q - b.q;
        if (a.r !== b.r) return a.r - b.r;
        return a.s - b.s;
    });
    return sorted.map(c => `${c.q},${c.r},${c.s}`).join('::');
}
