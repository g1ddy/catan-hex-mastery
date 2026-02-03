import { RuleEngine } from './validator';
import { GameState, RollStatus } from '../core/types';
import { STAGES } from '../core/constants';
import { Ctx } from 'boardgame.io';

describe('endTurn validation', () => {
    let G: GameState;
    let ctx: Ctx;

    beforeEach(() => {
        G = {
            players: {
                '0': { id: '0', resources: { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 }, settlements: [], roads: [], victoryPoints: 0, color: 'red' },
                '1': { id: '1', resources: { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 }, settlements: [], roads: [], victoryPoints: 0, color: 'blue' },
            },
            board: { hexes: {}, ports: {}, vertices: {}, edges: {} },
            rollStatus: RollStatus.IDLE,
        } as unknown as GameState;

        ctx = {
            currentPlayer: '0',
            activePlayers: { '0': STAGES.ACTING },
        } as unknown as Ctx;
    });

    it('should be valid in ACTING stage', () => {
        const result = RuleEngine.validateMove(G, ctx, 'endTurn', []);
        expect(result.isValid).toBe(true);
    });

    it('should be invalid in ROLLING stage', () => {
        ctx.activePlayers = { '0': STAGES.ROLLING };
        const result = RuleEngine.validateMove(G, ctx, 'endTurn', []);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('acting phase');
    });

    it('should be invalid in ROBBER stage', () => {
        ctx.activePlayers = { '0': STAGES.ROBBER };
        const result = RuleEngine.validateMove(G, ctx, 'endTurn', []);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('acting phase');
    });

    it('should be invalid if not the active player', () => {
        ctx.activePlayers = { '1': STAGES.ACTING };
        const result = RuleEngine.validateMove(G, ctx, 'endTurn', []);
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("It is not your turn to act.");
    });
});
