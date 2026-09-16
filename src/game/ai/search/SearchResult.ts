export interface SearchCandidate<A> {
  action: A;
  visits: number;
  value: number;
}

export interface SearchResult<A> {
  action: A | null;
  rootPlayer: string;
  iterations: number;
  rootVisits: number;
  candidates: readonly SearchCandidate<A>[];
  seed?: string | number;
  elapsedMs?: number;
}
