import { dismissRobber } from './robber';
import { STAGES } from '../constants';
import { createMockGameState } from '../testUtils';
import { RuleEngine } from '../rules/validator';
import { TerrainType, Hex, Vertex, Player } from '../types';
import { Ctx } from 'boardgame.io';
import { safeSet } from '../../utils/objectUtils';

jest.mock('../rules/validator', () => ({
    RuleEngine: {
        validateMoveOrThrow: jest.fn(),
    },
    getValidRobberVictims: jest.fn((G, _hexID) => {
        // Mock finding a victim if there's a settlement on the hex
        // This is a simplified mock to support the 'random steal' test
        if (G.board.vertices) {
            const hasVictim = Object.values(G.board.vertices).some((v: any) => v.owner === '1');
            if (hasVictim) return new Set(['1']);
        }
        return new Set();
    })
}));

const createFullPlayer = (p: Partial<Player>): Player => ({
    id: '0',
    name: 'Player',
    color: 'red',
    resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    settlements: [],
    roads: [],
    victoryPoints: 0,
    ...p,
});


describe('Robber Moves', () => {
    test('dismissRobber transitions to ACTING stage and updates location', () => {
        const G = createMockGameState({ robberLocation: 'A' });
        const events = {
            setActivePlayers: jest.fn()
        };
        const ctx: Ctx = { currentPlayer: '0' } as Ctx;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const random: any = { Shuffle: (arr: any[]) => arr }; // Simple mock

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const move = dismissRobber as any;

        // Execute
        move({ G, ctx, events, random }, 'B');

        // Verify Validation called
        expect(RuleEngine.validateMoveOrThrow).toHaveBeenCalledWith(G, ctx, 'dismissRobber', ['B', undefined]);

        // Verify State Update
        expect(G.robberLocation).toBe('B');

        // Verify Transition
        expect(events.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ACTING });
    });

    test('dismissRobber steals from random victim if none specified', () => {
         // Setup
         const hexID = '0,0,0';
         const victimID = '1';
         const thiefID = '0';
         const vertexID = '0,0,0::1,-1,0::1,0,-1';

         const G = createMockGameState({
             robberLocation: 'other',
             players: {
                 [thiefID]: createFullPlayer({ id: thiefID, resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } }),
                 [victimID]: createFullPlayer({ id: victimID, resources: { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 0 } })
             },
         });

         // Manually set up board state with Maps
         const hex: Hex = { id: hexID, coords: { q: 0, r: 0, s: 0 }, terrain: TerrainType.Fields, tokenValue: 6 };
         safeSet(G.board.hexes, hexID, hex);

         const vertex: Vertex = { owner: victimID, type: 'settlement' };
         safeSet(G.board.vertices, vertexID, vertex);


         const events = { setActivePlayers: jest.fn() };
         const ctx: Ctx = { currentPlayer: thiefID } as Ctx;
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const random: any = { Shuffle: (arr: any[]) => arr }; // Returns first element (wheat)

         const move = dismissRobber as any;

         // Execute
         move({ G, ctx, events, random }, hexID);

         // Verify Steal
         expect(G.players[victimID].resources.wheat).toBe(0);
         expect(G.players[thiefID].resources.wheat).toBe(1);

         // Verify Record
         expect(G.notification).toEqual({
             type: 'robber',
             thief: thiefID,
             victim: victimID,
             resource: 'wheat'
         });
    });
});
