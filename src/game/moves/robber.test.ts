import { dismissRobber } from './robber';
import { STAGES } from '../constants';
import { createMockGameState } from '../testUtils';
import { RuleEngine } from '../rules/validator';
import { TerrainType } from '../types';

jest.mock('../rules/validator', () => ({
    RuleEngine: {
        validateMoveOrThrow: jest.fn(),
    },
}));

describe('Robber Moves', () => {
    test('dismissRobber transitions to ACTING stage and updates location', () => {
        const G = createMockGameState({ robberLocation: 'A' });
        const events = {
            setActivePlayers: jest.fn()
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx: any = { currentPlayer: '0' };
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

         const G = createMockGameState({
             robberLocation: 'other',
             players: {
                 '0': { id: '0', resources: { wood: 0 }, settlements: [], roads: [] },
                 '1': { id: '1', resources: { wheat: 1 }, settlements: [], roads: [] }
             },
             board: {
                 hexes: {
                     [hexID]: { id: hexID, coords: { q: 0, r: 0, s: 0 }, terrain: TerrainType.Fields, tokenValue: 6 }
                 },
                 vertices: {
                     // Place victim on a vertex of the hex
                     '0,0,0::1,-1,0::1,0,-1': { owner: victimID, type: 'settlement' }
                 },
                 edges: {},
                 ports: {}
             }
         });

         const events = { setActivePlayers: jest.fn() };
         const ctx: any = { currentPlayer: thiefID };
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
