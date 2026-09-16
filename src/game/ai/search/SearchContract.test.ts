import { SearchGame, SearchTerminalResult } from './SearchGame';
import { SearchRandom, SeededSearchRandom } from './SearchRandom';
import { validateSearchConfig } from './SearchConfig';

interface ToyState {
  player: string;
  count: number;
  players: readonly string[];
}

type ToyAction = { type: 'INCREMENT'; amount: number } | { type: 'END_GAME' };

class ToySearchGame implements SearchGame<ToyState, ToyAction> {
  getCurrentPlayer(state: ToyState): string {
    return state.player;
  }

  getLegalActions(state: ToyState): readonly ToyAction[] {
    if (this.isTerminal(state)) return [];
    return [{ type: 'INCREMENT', amount: 1 }, { type: 'END_GAME' }];
  }

  applyAction(state: ToyState, action: ToyAction, random: SearchRandom): ToyState {
    if (action.type === 'END_GAME') {
      return { ...state, count: 100 };
    }
    const bonus = random.integer(3);
    const nextPlayerIndex = (state.players.indexOf(state.player) + 1) % state.players.length;
    return {
      ...state,
      player: state.players[nextPlayerIndex],
      count: state.count + action.amount + bonus,
    };
  }

  isTerminal(state: ToyState): boolean {
    return state.count >= 100;
  }

  getTerminalResult(state: ToyState): SearchTerminalResult | null {
    if (!this.isTerminal(state)) return null;
    return { kind: 'winner', winnerId: state.player };
  }

  getPlayers(state: ToyState): readonly string[] {
    return state.players;
  }
}

describe('Framework-neutral Search Contract', () => {
  describe('Toy SearchGame contract', () => {
    it('returns current player, legal actions, and player list', () => {
      const game = new ToySearchGame();
      const state: ToyState = { player: '0', count: 0, players: ['0', '1'] };

      expect(game.getCurrentPlayer(state)).toBe('0');
      expect(game.getPlayers(state)).toEqual(['0', '1']);
      expect(game.getLegalActions(state)).toHaveLength(2);
      expect(game.isTerminal(state)).toBe(false);
      expect(game.getTerminalResult(state)).toBeNull();
    });

    it('verifies state isolation when applying actions', () => {
      const game = new ToySearchGame();
      const rng: SearchRandom = new SeededSearchRandom(42);
      const initialState: ToyState = { player: '0', count: 0, players: ['0', '1'] };
      const nextState = game.applyAction(initialState, { type: 'INCREMENT', amount: 1 }, rng);

      expect(initialState.count).toBe(0);
      expect(initialState.player).toBe('0');
      expect(nextState.count).toBeGreaterThan(0);
      expect(nextState.player).toBe('1');
    });

    it('handles terminal state detection and result', () => {
      const game = new ToySearchGame();
      const rng: SearchRandom = new SeededSearchRandom(42);
      const state: ToyState = { player: '0', count: 0, players: ['0', '1'] };
      const terminalState = game.applyAction(state, { type: 'END_GAME' }, rng);

      expect(game.isTerminal(terminalState)).toBe(true);
      expect(game.getTerminalResult(terminalState)).toEqual({ kind: 'winner', winnerId: '0' });
      expect(game.getLegalActions(terminalState)).toEqual([]);
    });
  });

  describe('SeededSearchRandom determinism', () => {
    it('produces repeatable sequences for fixed numeric and string seeds', () => {
      const rng1 = new SeededSearchRandom('test-seed-123');
      const rng2 = new SeededSearchRandom('test-seed-123');

      const seq1 = Array.from({ length: 5 }, () => rng1.next());
      const seq2 = Array.from({ length: 5 }, () => rng2.next());

      expect(seq1).toEqual(seq2);
    });

    it('correctly implements integer, pick, and die methods', () => {
      const rng = new SeededSearchRandom(12345);

      const val = rng.integer(10);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(10);

      const picked = rng.pick(['apple', 'banana', 'cherry']);
      expect(['apple', 'banana', 'cherry']).toContain(picked);

      const dieRoll = rng.die(6);
      expect(dieRoll).toBeGreaterThanOrEqual(1);
      expect(dieRoll).toBeLessThanOrEqual(6);
    });

    it('validates invalid RNG arguments', () => {
      const rng = new SeededSearchRandom(1);

      expect(() => rng.integer(0)).toThrow('integer maxExclusive must be a positive integer');
      expect(() => rng.integer(-5)).toThrow('integer maxExclusive must be a positive integer');
      expect(() => rng.die(0)).toThrow('die sides must be a positive integer');
      expect(() => rng.pick([])).toThrow('Cannot pick from an empty array');
    });
  });

  describe('validateSearchConfig', () => {
    it('accepts valid configurations', () => {
      expect(() => validateSearchConfig({ iterations: 100, maxDepth: 10 })).not.toThrow();
      expect(() => validateSearchConfig({ iterations: 50, maxDepth: 10, seed: 'abc' })).not.toThrow();
    });

    it('rejects invalid iterations or maxDepth', () => {
      expect(() => validateSearchConfig({ iterations: 0, maxDepth: 10 })).toThrow('iterations must be a positive integer');
      expect(() => validateSearchConfig({ iterations: -10, maxDepth: 10 })).toThrow('iterations must be a positive integer');
      expect(() => validateSearchConfig({ iterations: 10.5, maxDepth: 10 })).toThrow('iterations must be a positive integer');
      expect(() => validateSearchConfig({ iterations: 100, maxDepth: 0 })).toThrow('maxDepth must be a positive integer');
    });
  });
});
