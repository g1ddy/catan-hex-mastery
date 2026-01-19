import { placeSettlement, placeRoad } from './setup';
import { GameState, RollStatus, TerrainType } from '../types';
import { Ctx } from 'boardgame.io';
import { EventsAPI } from 'boardgame.io/dist/types/src/plugins/events/events';

// Cast moves to function type for direct testing
const placeSettlementFn = placeSettlement as (args: unknown, vertexId: string) => unknown;
const placeRoadFn = placeRoad as (args: unknown, edgeId: string) => unknown;

// Create a safe Mock Events object
const createMockEvents = (): EventsAPI => ({
    endGame: jest.fn(),
    endPhase: jest.fn(),
    endStage: jest.fn(),
    endTurn: jest.fn(),
    pass: jest.fn(),
    setActivePlayers: jest.fn(),
    setPhase: jest.fn(),
    setStage: jest.fn(),
});

// Create a safe Mock Ctx object with defaults
const createMockCtx = (overrides?: Partial<Ctx>): Ctx => ({
    numPlayers: 2,
    playOrder: ['0', '1'],
    playOrderPos: 0,
    activePlayers: null,
    currentPlayer: '0',
    turn: 1,
    phase: 'setup',
    gameover: undefined,
    ...overrides
});

// We need these for "on board" validation
const mockHexes = {
    '0,0,0': { id: '0,0,0', coords: {q:0,r:0,s:0}, terrain: TerrainType.Forest, tokenValue: 6 },
    '1,-1,0': { id: '1,-1,0', coords: {q:1,r:-1,s:0}, terrain: TerrainType.Fields, tokenValue: 5 },
    '0,-1,1': { id: '0,-1,1', coords: {q:0,r:-1,s:1}, terrain: TerrainType.Pasture, tokenValue: 4 },
    '-1,1,0': { id: '-1,1,0', coords: {q:-1,r:1,s:0}, terrain: TerrainType.Hills, tokenValue: 8 },
    '-1,0,1': { id: '-1,0,1', coords: {q:-1,r:0,s:1}, terrain: TerrainType.Mountains, tokenValue: 10 },
    '1,0,-1': { id: '1,0,-1', coords: {q:1,r:0,s:-1}, terrain: TerrainType.Forest, tokenValue: 3 },
};

// Create a safe Mock GameState object with defaults
const createMockGameState = (overrides?: Partial<GameState>): GameState => ({
    board: {
        hexes: mockHexes, // Injected valid hexes
        vertices: {},
        edges: {},
        ports: {},
    },
    players: {
        '0': {
            id: '0',
            name: 'Player 1',
            color: 'red',
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            settlements: [],
            roads: [],
            victoryPoints: 0
        }
    },
    setupPhase: { activeRound: 1 },
    setupOrder: ['0'],
    lastRoll: [0, 0],
    lastRollRewards: {},
    boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
    rollStatus: RollStatus.IDLE,
    robberLocation: '0',
    playersToDiscard: [],
    ...overrides
});

describe('Setup Phase Moves', () => {
    let G: GameState;
    let ctx: Ctx;
    let events: EventsAPI;

    beforeEach(() => {
        G = createMockGameState();
        ctx = createMockCtx();
        events = createMockEvents();
    });

    describe('placeSettlement', () => {
        it('should place settlement', () => {
            const vId = "0,0,0::1,-1,0::0,-1,1";
            placeSettlementFn({ G, ctx, events, playerID: '0' }, vId);

            expect(G.board.vertices[vId]).toBeDefined();
            expect(G.players['0'].settlements).toContain(vId);
            // events.setStage is no longer called, handled by config
            expect(events.setStage).not.toHaveBeenCalled();
            expect(events.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: 'placeRoad' });
        });
    });

    describe('placeRoad', () => {
        it('should allow road connected to last placed settlement', () => {
            const vId = "0,0,0::1,-1,0::0,-1,1";
            // Mock placement of settlement
            G.players['0'].settlements.push(vId);
            G.board.vertices[vId] = { owner: '0', type: 'settlement' };

            const validEdge = "0,0,0::1,-1,0";

            placeRoadFn({ G, ctx, events, playerID: '0' }, validEdge);

            expect(G.board.edges[validEdge]).toBeDefined();
            expect(events.endTurn).toHaveBeenCalled();
        });

        it('should fail if no settlement has been placed', () => {
            const edgeId = "0,0,0::1,-1,0";
            const move = () => placeRoadFn({ G, ctx, events }, edgeId);
            expect(move).toThrow("No active settlement found to connect to");
        });

        it('should fail if the road is not connected to the last settlement', () => {
            // Place a settlement to establish the connection point
            G.players['0'].settlements.push("0,0,0::-1,1,0::-1,0,1");

            const disconnectedEdgeId = "1,0,-1::2,-1,-1"; // An edge not touching the settlement (and potentially invalid if hexes mismatch, but mainly checking connectivity here)
            // Wait, we need to ensure this edge is technically "on board" for the validation to reach the "connected" check?
            // "1,0,-1" is in mockHexes. "2,-1,-1" is NOT.
            // If "2,-1,-1" is not in mockHexes, then "1,0,-1::2,-1,-1" is valid IF at least one hex is valid.
            // 1,0,-1 is valid. So this edge is "on board" (it's a coastal edge).
            // So validation proceeds to connectivity check.

            const move = () => placeRoadFn({ G, ctx, events }, disconnectedEdgeId);

            expect(move).toThrow("Road must connect to your just-placed settlement");
        });

        it('should fail if the edge is already occupied', () => {
            const edgeId = "0,0,0::1,-1,0";
            G.board.edges[edgeId] = { owner: '1' }; // Occupied by another player
            G.players['0'].settlements.push("0,0,0::1,-1,0::0,-1,1"); // Player '0' has a settlement nearby

            const move = () => placeRoadFn({ G, ctx, events }, edgeId);

            expect(move).toThrow("This edge is already occupied");
        });
    });
});
