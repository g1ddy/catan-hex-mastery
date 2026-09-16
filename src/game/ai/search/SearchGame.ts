import type { SearchRandom } from './SearchRandom';

export type SearchTerminalResult =
  | { kind: 'winner'; winnerId: string }
  | { kind: 'draw' };

export interface SearchGame<S, A> {
  getCurrentPlayer(state: S): string;
  getLegalActions(state: S): readonly A[];
  applyAction(state: S, action: A, random: SearchRandom): S;
  isTerminal(state: S): boolean;
  getTerminalResult(state: S): SearchTerminalResult | null;
  getPlayers(state: S): readonly string[];
}
