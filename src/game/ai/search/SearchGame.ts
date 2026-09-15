export type SearchTerminalResult =
  | { kind: 'winner'; winnerId: string }
  | { kind: 'draw' };

export type SearchUtility = Readonly<Record<string, number>>;

export interface SearchGame<S, A> {
  getCurrentPlayer(state: S): string;
  getLegalActions(state: S): readonly A[];
  applyAction(state: S, action: A, random: SearchRandom): S;
  isTerminal(state: S): boolean;
  getTerminalResult(state: S): SearchTerminalResult | null;
  getPlayers(state: S): readonly string[];
}

import type { SearchRandom } from './SearchRandom';
