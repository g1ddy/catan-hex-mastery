import { checkTerminalResult, advanceCatanTurn } from '../rules/lifecycle';
import { executeCatanMove } from './execution';
import { createMockGameState, createTestPlayer } from '../testUtils';
import { GameContext, GameRandom } from '../core/types';
import { PHASES, STAGES, WINNING_SCORE, MAX_TURNS } from '../core/constants';

const mockRng: GameRandom = {
  Die: (sides) => 1 % sides + 1,
  Shuffle: (values) => [...values],
};

describe('Catan Lifecycle Rules Seam', () => {
  describe('checkTerminalResult', () => {
    it('returns null for non-terminal state', () => {
      const G = createMockGameState();
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 10,
        numPlayers: 2,
      };

      expect(checkTerminalResult(G, ctx)).toBeNull();
    });

    it('returns winner when player reaches WINNING_SCORE', () => {
      const G = createMockGameState({
        players: {
          '0': createTestPlayer('0', { victoryPoints: WINNING_SCORE }),
        },
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 10,
        numPlayers: 2,
      };

      expect(checkTerminalResult(G, ctx)).toEqual({ winner: '0' });
    });

    it('returns draw when turn exceeds MAX_TURNS', () => {
      const G = createMockGameState();
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: MAX_TURNS + 1,
        numPlayers: 2,
      };

      expect(checkTerminalResult(G, ctx)).toEqual({ draw: true });
    });

    it('respects existing gameover context if set', () => {
      const G = createMockGameState();
      const ctxWinner: GameContext = {
        currentPlayer: '0',
        turn: 10,
        numPlayers: 2,
        gameover: { winner: '1' },
      };
      expect(checkTerminalResult(G, ctxWinner)).toEqual({ winner: '1' });

      const ctxDraw: GameContext = {
        currentPlayer: '0',
        turn: 10,
        numPlayers: 2,
        gameover: { draw: true },
      };
      expect(checkTerminalResult(G, ctxDraw)).toEqual({ draw: true });
    });
  });

  describe('advanceCatanTurn', () => {
    it('advances snake draft order during setup phase', () => {
      const G = createMockGameState({
        players: {
          '0': createTestPlayer('0'),
          '1': createTestPlayer('1'),
        },
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 1, // first turn of draft ['0', '1', '1', '0']
        phase: PHASES.SETUP,
        numPlayers: 2,
      };

      advanceCatanTurn(G, ctx);

      expect(ctx.currentPlayer).toBe('1');
      expect(ctx.turn).toBe(2);
      expect(ctx.stagesByPlayer).toEqual({ '1': STAGES.PLACE_SETTLEMENT });
    });

    it('transitions from setup to gameplay phase after full draft order', () => {
      const G = createMockGameState({
        players: {
          '0': createTestPlayer('0'),
          '1': createTestPlayer('1'),
        },
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 4, // last turn of 2-player snake draft
        phase: PHASES.SETUP,
        numPlayers: 2,
      };

      advanceCatanTurn(G, ctx);

      expect(ctx.phase).toBe(PHASES.GAMEPLAY);
      expect(ctx.turn).toBe(1);
      expect(ctx.currentPlayer).toBe('0');
      expect(ctx.stagesByPlayer).toEqual({ '0': STAGES.ROLLING });
    });

    it('advances round-robin player turns during gameplay phase', () => {
      const G = createMockGameState({
        players: {
          '0': createTestPlayer('0'),
          '1': createTestPlayer('1'),
        },
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 5,
        phase: PHASES.GAMEPLAY,
        numPlayers: 2,
      };

      advanceCatanTurn(G, ctx);

      expect(ctx.currentPlayer).toBe('1');
      expect(ctx.turn).toBe(6);
      expect(ctx.stagesByPlayer).toEqual({ '1': STAGES.ROLLING });
    });
  });

  describe('executeCatanMove execution & lifecycle parity', () => {
    it('correctly executes rollDice and transitions stage to ROLLING', () => {
      const G = createMockGameState({
        players: { '0': createTestPlayer('0') },
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 1,
        phase: PHASES.GAMEPLAY,
        stagesByPlayer: { '0': STAGES.ROLLING },
        numPlayers: 1,
      };

      const result = executeCatanMove(G, ctx, { move: 'rollDice', args: [] }, mockRng);

      expect(result.G.rollStatus).toBe('rolling');
    });

    it('correctly executes endTurn move and advances turn', () => {
      const G = createMockGameState({
        players: {
          '0': createTestPlayer('0'),
          '1': createTestPlayer('1'),
        },
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 1,
        phase: PHASES.GAMEPLAY,
        stagesByPlayer: { '0': STAGES.ACTING },
        numPlayers: 2,
      };

      const result = executeCatanMove(G, ctx, { move: 'endTurn', args: [] }, mockRng);

      expect(result.ctx.currentPlayer).toBe('1');
      expect(result.ctx.turn).toBe(2);
      expect(result.ctx.stagesByPlayer).toEqual({ '1': STAGES.ROLLING });
    });
  });
});
