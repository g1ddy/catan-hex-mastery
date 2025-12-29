import { placeSettlement, placeRoad } from './setup';
import { GameState } from '../types';
import { Ctx } from 'boardgame.io';
import { EventsAPI } from 'boardgame.io/dist/types/src/plugins/events/events';

// Cast moves to function type for direct testing
const placeSettlementFn = placeSettlement as (args: any, vertexId: string) => any;
const placeRoadFn = placeRoad as (args: any, edgeId: string) => any;

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
    setupPhase: { activeRound: 1, activeSettlement: null },
    setupOrder: ['0'],
    lastRoll: [0, 0],
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
        it('should place settlement and set activeSettlement', () => {
            const vId = "0,0,0::1,-1,0::0,-1,1";
            placeSettlementFn({ G, ctx, events, random: {} as any, playerID: '0' }, vId);

            expect(G.board.vertices[vId]).toBeDefined();
            expect(G.setupPhase.activeSettlement).toBe(vId);
            expect(events.setStage).toHaveBeenCalledWith('placeRoad');
        });
    });

    describe('placeRoad', () => {
        it('should allow road connected to activeSettlement', () => {
            const vId = "0,0,0::1,-1,0::0,-1,1";
            G.setupPhase.activeSettlement = vId;

            const validEdge = "0,0,0::1,-1,0";

            const result = placeRoadFn({ G, ctx, events, random: {} as any, playerID: '0' }, validEdge);

            expect(result).not.toBe('INVALID_MOVE');
            expect(G.board.edges[validEdge]).toBeDefined();
            expect(G.setupPhase.activeSettlement).toBeNull(); // Should be reset
            expect(events.endTurn).toHaveBeenCalled();
        });

        it('should fail if no activeSettlement set', () => {
            G.setupPhase.activeSettlement = null;
            const validEdge = "0,0,0::1,-1,0";
            const result = placeRoadFn({ G, ctx, events, random: {} as any, playerID: '0' }, validEdge);
            expect(result).toBe('INVALID_MOVE');
        });

        it('should fail if road is NOT connected to activeSettlement', () => {
            const vId = "0,0,0::1,-1,0::0,-1,1";
            G.setupPhase.activeSettlement = vId;

            // Pick an edge far away
            const disconnectedEdge = "5,0,-5::5,-1,-4";

            const result = placeRoadFn({ G, ctx, events, random: {} as any, playerID: '0' }, disconnectedEdge);

            expect(result).toBe('INVALID_MOVE');
            expect(G.board.edges[disconnectedEdge]).toBeUndefined();
            expect(G.setupPhase.activeSettlement).toBe(vId); // Not reset
        });
    });
});
