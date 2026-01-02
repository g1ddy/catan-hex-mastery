import { placeSettlement, placeRoad } from './setup';
import { GameState } from '../types';
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

// Create a safe Mock GameState object with defaults
const createMockGameState = (overrides?: Partial<GameState>): GameState => ({
    board: {
        hexes: {},
        vertices: {},
        edges: {},
    },
    players: {
        '0': {
            id: '0',
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
    hasRolled: false,
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

        it('should fail if no settlement placed yet', () => {
            G.players['0'].settlements = [];
            const validEdge = "0,0,0::1,-1,0";
            const call = () => placeRoadFn({ G, ctx, events, playerID: '0' }, validEdge);
            expect(call).toThrow("No active settlement found to connect to");
        });

        it('should fail if road is NOT connected to last settlement', () => {
            const vId = "0,0,0::1,-1,0::0,-1,1";
            G.players['0'].settlements.push(vId);
            G.board.vertices[vId] = { owner: '0', type: 'settlement' };

            // Pick an edge far away
            const disconnectedEdge = "5,0,-5::5,-1,-4";

            const call = () => placeRoadFn({ G, ctx, events, playerID: '0' }, disconnectedEdge);

            expect(call).toThrow("Road must connect to your just-placed settlement");
            expect(G.board.edges[disconnectedEdge]).toBeUndefined();
        });
    });
});
