import { checkTerminalResult, advanceCatanTurn } from '../rules/lifecycle';
import { executeCatanMove } from './execution';
import { createMockGameState, createTestPlayer } from '../testUtils';
import { GameContext, GameRandom, RollStatus } from '../core/types';
import { PHASES, STAGES, WINNING_SCORE, MAX_TURNS } from '../core/constants';
import { generateBoard } from '../generation/boardGen';
import { getVerticesForHex, getEdgesForHex } from '../geometry/hexUtils';

const mockRng: GameRandom = {
  Die: (sides) => 1 % sides + 1,
  Shuffle: <T>(values: T[]) => [...values],
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

  describe('executeCatanMove execution & lifecycle transitions across move families', () => {
    it('executes rollDice and sets rollStatus to ROLLING', () => {
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

      expect(result.G.rollStatus).toBe(RollStatus.ROLLING);
    });

    it('executes resolveRoll and transitions stage to ACTING for non-7 roll', () => {
      const G = createMockGameState({
        players: { '0': createTestPlayer('0') },
        rollStatus: RollStatus.ROLLING,
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 1,
        phase: PHASES.GAMEPLAY,
        stagesByPlayer: { '0': STAGES.ROLLING },
        numPlayers: 1,
      };

      // Mock roll dice result 2+2=4
      const rng: GameRandom = {
        Die: () => 2,
        Shuffle: (arr) => arr,
      };

      const result = executeCatanMove(G, ctx, { move: 'resolveRoll', args: [] }, rng);

      expect(result.G.rollStatus).toBe(RollStatus.RESOLVED);
      expect(result.G.lastRoll).toEqual([2, 2]);
      expect(result.ctx.stagesByPlayer).toEqual({ '0': STAGES.ACTING });
    });

    it('executes resolveRoll (7 roll) and transitions stage to ROBBER', () => {
      const G = createMockGameState({
        players: { '0': createTestPlayer('0') },
        rollStatus: RollStatus.ROLLING,
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 1,
        phase: PHASES.GAMEPLAY,
        stagesByPlayer: { '0': STAGES.ROLLING },
        numPlayers: 1,
      };

      // Mock roll 3+4=7
      let rollCount = 0;
      const rng: GameRandom = {
        Die: () => (++rollCount === 1 ? 3 : 4),
        Shuffle: (arr) => arr,
      };

      const result = executeCatanMove(G, ctx, { move: 'resolveRoll', args: [] }, rng);

      expect(result.G.lastRoll).toEqual([3, 4]);
      expect(result.ctx.stagesByPlayer).toEqual({ '0': STAGES.ROBBER });
    });

    it('executes setup placeSettlement and transitions stage to PLACE_ROAD', () => {
      const { hexes, ports } = generateBoard();
      const hexList = Object.values(hexes);
      const vId = getVerticesForHex(hexList[0].coords)[0];

      const G = createMockGameState({
        board: { hexes, ports, vertices: {}, edges: {} },
        players: { '0': createTestPlayer('0') },
        setupPhase: { activeRound: 1 },
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 1,
        phase: PHASES.SETUP,
        stagesByPlayer: { '0': STAGES.PLACE_SETTLEMENT },
        numPlayers: 1,
      };

      const result = executeCatanMove(G, ctx, { move: 'placeSettlement', args: [vId] }, mockRng);

      expect(result.G.players['0'].settlements).toContain(vId);
      expect(result.ctx.stagesByPlayer).toEqual({ '0': STAGES.PLACE_ROAD });
    });

    it('executes setup placeRoad and advances setup turn', () => {
      const { hexes, ports } = generateBoard();
      const hexList = Object.values(hexes);
      const vId = getVerticesForHex(hexList[0].coords)[0];
      const eId = getEdgesForHex(hexList[0].coords)[0];

      const G = createMockGameState({
        board: {
          hexes,
          ports,
          vertices: { [vId]: { owner: '0', type: 'settlement' } },
          edges: {},
        },
        players: {
          '0': createTestPlayer('0', { settlements: [vId] }),
          '1': createTestPlayer('1'),
        },
        setupPhase: { activeRound: 1 },
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 1,
        phase: PHASES.SETUP,
        stagesByPlayer: { '0': STAGES.PLACE_ROAD },
        numPlayers: 2,
      };

      const result = executeCatanMove(G, ctx, { move: 'placeRoad', args: [eId] }, mockRng);

      expect(result.G.players['0'].roads).toContain(eId);
      expect(result.ctx.currentPlayer).toBe('1');
      expect(result.ctx.turn).toBe(2);
      expect(result.ctx.stagesByPlayer).toEqual({ '1': STAGES.PLACE_SETTLEMENT });
    });

    it('executes buildRoad during acting phase', () => {
      const { hexes, ports } = generateBoard();
      const hexList = Object.values(hexes);
      const vId = getVerticesForHex(hexList[0].coords)[0];
      const eId = getEdgesForHex(hexList[0].coords)[0];

      const G = createMockGameState({
        board: {
          hexes,
          ports,
          vertices: { [vId]: { owner: '0', type: 'settlement' } },
          edges: {},
        },
        players: {
          '0': createTestPlayer('0', {
            settlements: [vId],
            resources: { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 },
          }),
        },
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 5,
        phase: PHASES.GAMEPLAY,
        stagesByPlayer: { '0': STAGES.ACTING },
        numPlayers: 1,
      };

      const result = executeCatanMove(G, ctx, { move: 'buildRoad', args: [eId] }, mockRng);

      expect(result.G.players['0'].roads).toContain(eId);
      expect(result.G.players['0'].resources.wood).toBe(0);
      expect(result.G.players['0'].resources.brick).toBe(0);
    });

    it('executes tradeBank during acting phase', () => {
      const G = createMockGameState({
        players: {
          '0': createTestPlayer('0', {
            resources: { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 },
          }),
        },
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 5,
        phase: PHASES.GAMEPLAY,
        stagesByPlayer: { '0': STAGES.ACTING },
        numPlayers: 1,
      };

      const result = executeCatanMove(G, ctx, { move: 'tradeBank', args: [] }, mockRng);

      expect(result.ctx.stagesByPlayer).toEqual({ '0': STAGES.ACTING });
    });

    it('executes endTurn move and advances turn to next player in gameplay', () => {
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
        stagesByPlayer: { '0': STAGES.ACTING },
        numPlayers: 2,
      };

      const result = executeCatanMove(G, ctx, { move: 'endTurn', args: [] }, mockRng);

      expect(result.ctx.currentPlayer).toBe('1');
      expect(result.ctx.turn).toBe(6);
      expect(result.ctx.stagesByPlayer).toEqual({ '1': STAGES.ROLLING });
    });

    it('detects gameover when a move reaches winning VP', () => {
      const { hexes, ports } = generateBoard();
      const hexList = Object.values(hexes);
      const vId1 = getVerticesForHex(hexList[0].coords)[0];

      const G = createMockGameState({
        board: {
          hexes,
          ports,
          vertices: { [vId1]: { owner: '0', type: 'settlement' } },
          edges: {},
        },
        players: {
          '0': createTestPlayer('0', {
            settlements: [vId1],
            victoryPoints: WINNING_SCORE - 1,
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 },
          }),
        },
      });
      const ctx: GameContext = {
        currentPlayer: '0',
        turn: 5,
        phase: PHASES.GAMEPLAY,
        stagesByPlayer: { '0': STAGES.ACTING },
        numPlayers: 1,
      };

      const result = executeCatanMove(G, ctx, { move: 'buildCity', args: [vId1] }, mockRng);

      expect(result.G.players['0'].victoryPoints).toBe(WINNING_SCORE);
      expect(result.ctx.phase).toBe(PHASES.GAME_OVER);
      expect(result.ctx.gameover).toEqual({ winner: '0' });
    });
  });
});
