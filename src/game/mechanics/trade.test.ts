import { calculateTrade, getExchangeRates } from './trade';
import { GameState, Port } from '../types';
import { createTestGameState } from '../testUtils';

describe('Trade Logic', () => {
    describe('calculateTrade', () => {
        const defaultRates = { wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 4 };

        it('should identify the trade that maximizes remainder (5 Wood vs 2 Sheep)', () => {
            const resources = {
                wood: 5, // Cost 4 -> Remainder 1
                brick: 0,
                sheep: 2, // Cost 2 -> Remainder 0
                wheat: 0,
                ore: 0
            };
            const rates = { ...defaultRates, sheep: 2 }; // Sheep port
            const portEdges = { sheep: 'edge-sheep' };

            const result = calculateTrade(resources, rates, portEdges);

            // Wood wins because Remainder 1 > Remainder 0
            expect(result.give).toBe('wood');
            expect(result.giveAmount).toBe(4);
            expect(result.usedPortEdgeId).toBeUndefined();
        });

        it('should prioritize efficient trade if remainders are equal? (Tie-breaking)', () => {
             // 6 Wood (Cost 4) -> Remainder 2
             // 4 Brick (Cost 2) -> Remainder 2
             const resources = {
                 wood: 6,
                 brick: 4,
                 sheep: 0,
                 wheat: 0,
                 ore: 0
             };
             const rates = { ...defaultRates, brick: 2 };

             const result = calculateTrade(resources, rates);

             // Current logic: sort is stable or dependent on insertion order.
             // If b.remainder - a.remainder === 0, it preserves order?
             // RESOURCE_ORDER is Wood, Brick...
             // Wood comes first.
             expect(result.give).toBe('wood');
        });

        it('should use specific port rates', () => {
             const resources = {
                 wood: 3,
                 brick: 3,
                 sheep: 3,
                 wheat: 3,
                 ore: 3
             };
             // With 4:1, no trade.
             // With 3:1 on wood, trade possible.
             const rates = { ...defaultRates, wood: 3 };
             const portEdges = { wood: 'p1' };

             const result = calculateTrade(resources, rates, portEdges);

             expect(result.canTrade).toBe(true);
             expect(result.give).toBe('wood');
             expect(result.giveAmount).toBe(3);
             expect(result.usedPortEdgeId).toBe('p1');
        });

        it('should fallback to false if no trade possible', () => {
            const resources = { wood: 3, brick: 3, sheep: 3, wheat: 3, ore: 3 };
            const result = calculateTrade(resources); // Default 4:1
            expect(result.canTrade).toBe(false);
        });
    });

    describe('getExchangeRates', () => {
        // Mock Helper
        const mockGWithPorts = (ports: Record<string, Port>, playerSettlements: string[]): GameState => {
            const G = createTestGameState();
            // Setup ports
            G.board.ports = ports;

            // Setup player ownership
            // Ensure player exists
            if (!G.players['0']) {
                // @ts-ignore - Partial player for test
                G.players['0'] = { resources: {} };
            }
            G.players['0'].settlements = playerSettlements; // '0' is default test player

            // Setup vertices
            G.board.vertices = {};
            playerSettlements.forEach(vId => {
                // eslint-disable-next-line security/detect-object-injection
                G.board.vertices[vId] = { owner: '0', type: 'settlement' };
            });

            return G;
        };

        it('should return 4:1 defaults for player with no ports', () => {
            const G = createTestGameState();
            // Ensure player exists
            if (!G.players['0']) {
                // @ts-ignore - Partial player for test
                G.players['0'] = { resources: {}, settlements: [] };
            }
            const { rates } = getExchangeRates(G, '0');
            expect(rates).toEqual({ wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 4 });
        });

        it('should apply 3:1 generic port', () => {
            const ports: Record<string, Port> = {
                'e1': { type: '3:1', edgeId: 'e1', vertices: ['v1', 'v2'] }
            };
            const G = mockGWithPorts(ports, ['v1']);
            const { rates, portEdges } = getExchangeRates(G, '0');

            expect(rates).toEqual({ wood: 3, brick: 3, sheep: 3, wheat: 3, ore: 3 });
            expect(portEdges.wood).toBe('e1');
            expect(portEdges.ore).toBe('e1');
        });

        it('should apply 2:1 specific port', () => {
            const ports: Record<string, Port> = {
                'e1': { type: 'brick', edgeId: 'e1', vertices: ['v1', 'v2'] }
            };
            const G = mockGWithPorts(ports, ['v2']);
            const { rates, portEdges } = getExchangeRates(G, '0');

            expect(rates.brick).toBe(2);
            expect(rates.wood).toBe(4); // Others remain 4
            expect(portEdges.brick).toBe('e1');
            expect(portEdges.wood).toBeUndefined();
        });

        it('should prioritize 2:1 over 3:1', () => {
            const ports: Record<string, Port> = {
                'e1': { type: '3:1', edgeId: 'e1', vertices: ['v1', 'v2'] },
                'e2': { type: 'wood', edgeId: 'e2', vertices: ['v3', 'v4'] }
            };
            const G = mockGWithPorts(ports, ['v1', 'v3']); // Owns both
            const { rates, portEdges } = getExchangeRates(G, '0');

            expect(rates.wood).toBe(2); // Specific
            expect(rates.brick).toBe(3); // Generic
            expect(portEdges.wood).toBe('e2');
            expect(portEdges.brick).toBe('e1');
        });
    });
});
