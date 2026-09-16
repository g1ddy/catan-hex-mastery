# Catan AI Search Architecture

## Purpose

This document is the normative source of truth for the Catan-owned search boundary introduced by #477 and consumed by #478–#484.

The goal is to make AI search independent of boardgame.io without introducing a generic game-AI framework. Catan owns the state, commands, rules, lifecycle, randomness adapter, evaluation, and bot integration boundaries.

## 1. Research basis

The design is informed by established Monte Carlo Tree Search literature and Catan-specific work, while intentionally keeping #477 limited to the game/search seam.

- Browne et al., *A Survey of Monte Carlo Tree Search Methods* (2012)
- Szita, Chaslot, Spronk, *Monte-Carlo Tree Search in Settlers of Catan*
- OpenSpiel's game/search abstractions as a reference for explicit state, action, player, terminal, and chance semantics

The first implementation assumes perfect information and does not introduce an explicit chance-node hierarchy.

## 2. Design goals

1. Search code must not import boardgame.io, React, Redux, browser APIs, or runtime transport types.
2. Catan rules remain authoritative for legal actions, transitions, lifecycle, and terminal conditions.
3. Search actions are Catan commands, not runtime dispatch envelopes.
4. Search state is complete enough to continue simulation without consulting runtime state.
5. `applyAction` has no observable mutation of its input state.
6. Randomness is explicit and deterministic for a fixed seed and call sequence.
7. Evaluation remains separate from the game contract.
8. Multiplayer utility semantics are explicit rather than silently assuming two-player zero-sum search.
9. The implementation is Catan-owned rather than a reusable AI framework.

## 3. Dependency direction

The intended dependency direction is:

```text
Catan core/rules/moves
        ↑
Catan search adapter
        ↑
Catan-owned search engine
        ↑
Bots / Coach
```

Runtime adapters may depend on Catan-owned moves and state, but search must never depend on runtime adapters.

## 4. Search contract

### 4.1 `SearchGame<S, A>`

```ts
interface SearchGame<S, A> {
  getCurrentPlayer(state: S): string;
  getLegalActions(state: S): readonly A[];
  applyAction(state: S, action: A, random: SearchRandom): S;
  isTerminal(state: S): boolean;
  getTerminalResult(state: S): SearchTerminalResult | null;
  getPlayers(state: S): readonly string[];
}
```

`SearchGame` answers rules questions: what can happen, what state results, and whether the game is over. It does not answer strategy questions.

### 4.2 Search consumes domain commands

A search action represents what Catan move should happen, not how the current runtime dispatches it.

Good:

```ts
{ move: 'buildSettlement', args: ['v12'] }
```

Not part of search:

```ts
{
  type: 'MAKE_MOVE',
  payload: {
    playerID: '0',
    type: 'buildSettlement',
    args: ['v12']
  }
}
```

The latter is a transport/runtime envelope and belongs outside search.

### 4.3 Search state is complete for simulation

A search state must contain everything required to:

1. identify the acting player;
2. enumerate legal actions;
3. apply a chosen action;
4. advance lifecycle/turn/stage state;
5. determine terminal results.

For Catan today, that means `GameState` plus the framework-neutral `GameContext` lifecycle state.

Do not duplicate `GameState` into an AI-specific mirror merely to satisfy the search API.

### 4.4 `getLegalActions`

Legal means the action can actually be executed from the supplied state. The Catan adapter builds on the Catan-owned rule enumerator rather than duplicating legality logic.

Actions returned to search must be canonical and deterministic, and parameterized choices such as settlement/road locations and robber victims must be preserved.

`BotMove` currently contains `buyDevCard` for forward compatibility, but development-card purchase is not implemented by the game. Until a real Catan-owned handler exists, `CatanSearchAction` explicitly excludes that command and the search adapter filters it from enumerated actions. This is preferable to advertising an action that `applyAction` cannot execute.

### 4.5 `applyAction`

Applies a canonical Catan action and returns the resulting search state.

Rules:

- do not mutate the input state from the caller's perspective;
- use the Catan-owned transition path rather than calling boardgame.io directly;
- pass the explicit search RNG into stochastic transitions;
- produce a state immediately valid for the next search step;
- preserve lifecycle state required by the next legal-action query.

The current migration seam is `executeCatanMove`. It is deliberately Catan-owned and has no boardgame.io/runtime imports. It invokes the same Catan move handlers used by the runtime and supplies only the small event callbacks those handlers require (`endTurn` and `setActivePlayers`). Lifecycle work that boardgame.io normally performs after those callbacks is centralized in `rules/lifecycle.ts` for the framework-neutral path.

This seam is migration glue, not a second rules engine: it must remain limited to cloning state, invoking an existing Catan move handler, applying its lifecycle callbacks, and deriving terminal state from the shared lifecycle rules. New move legality or strategic behavior does not belong here.

### 4.6 Terminal semantics

```ts
type SearchTerminalResult =
  | { kind: 'winner'; winnerId: string }
  | { kind: 'draw' };
```

Terminal results are derived from `checkTerminalResult` in Catan-owned lifecycle code. The search engine must not duplicate winner rules.

### 4.7 Stable player ordering

`getPlayers` returns participating Catan player IDs in stable numeric order. Deterministic ordering matters for reproducible tests and multiplayer aggregation.

## 5. Search randomness

```ts
interface SearchRandom {
  next(): number;
  integer(maxExclusive: number): number;
  pick<T>(values: readonly T[]): T;
  die(sides: number): number;
}
```

All methods are deterministic for a fixed seed and call sequence. No search code may use `Math.random`, module-global RNG state, boardgame.io randomness, or runtime state to obtain randomness.

The Catan adapter converts `SearchRandom` to the existing `GameRandom` interface. The adapter must not mutate caller-owned arrays when shuffling.

## 6. Catan search state/action

```ts
interface CatanSearchState {
  game: GameState;
  context: GameContext;
}

type CatanSearchAction = Catan-owned executable BotMove;
```

The concrete implementation excludes `buyDevCard` until that move is implemented.

Search consumes `BotMove` values rather than `MakeMoveAction` transport envelopes.

## 7. Evaluation boundary

An evaluator answers how good a non-terminal state is for a player. It is separate from `SearchGame` so MCTS can remain ignorant of Catan strategy and multiple bot personalities can share the same search engine.

The preferred multiplayer utility representation is:

```ts
type SearchUtility = Readonly<Record<string, number>>;
```

with normalized values in `[0, 1]`. Terminal values are `1` for the winner and `0` for other players; draws are `0.5` for every player. Exact heuristic evaluation belongs to #480.

## 8. Chance and information

The first implementation treats stochastic transitions through `SearchRandom` supplied to `applyAction`. It does not require explicit chance nodes.

The first implementation assumes perfect information. No information-set abstraction belongs in #477.

## 9. Catan adapter responsibilities

`CatanSearchGame` is intentionally thin. It owns only the mapping between the framework-neutral search contract and Catan-owned machinery:

- current player → `GameContext.currentPlayer`;
- players → stable Catan player IDs;
- legal actions → `rules/enumerator`;
- transitions → `moves/execution`;
- terminal state → `rules/lifecycle`;
- search RNG → Catan `GameRandom` adapter.

It must not contain MCTS selection, UCT, rollout strategy, evaluation heuristics, or runtime dispatch.

## 10. Transition equivalence and regression coverage

The transition seam is correct by construction only if runtime and search invoke the same move handlers. Regression tests must therefore cover representative paths through every currently executable move family:

- setup settlement and road placement, including snake-draft advancement;
- road, settlement, and city construction;
- bank trade;
- dice roll and roll resolution;
- robber destination/victim and resource transfer;
- end turn and next-player lifecycle;
- board regeneration where it remains a legal command;
- terminal winner and turn-limit draw.

For stochastic transitions, tests use a fixed `SearchRandom` seed and assert repeatable resulting state. Tests also assert the input state remains unchanged.

A direct runtime/search byte-for-byte comparison is not currently appropriate because boardgame.io owns runtime dispatch and its context representation. The meaningful invariant is that both paths invoke the same Catan-owned move handler and that the search seam supplies equivalent `GameContext` lifecycle semantics. The shared handler plus lifecycle regression tests are the guardrail until #484 removes the runtime dependency.

`buyDevCard` is intentionally not in this coverage set because the canonical move exists only as a forward-compatible type declaration; the underlying handler is not implemented.

## 11. Error behavior

Unsupported commands must fail explicitly rather than silently producing an unchanged state. Search should not discover unsupported commands through its legal-action surface.

Invalid actions should remain governed by the Catan move/rule layer. Search does not invent alternate legality semantics.

## 12. Configuration/result contracts

The search engine consumes:

```ts
interface SearchConfig {
  iterations: number;
  maxDepth: number;
  seed?: string | number;
}
```

`iterations` and `maxDepth` must be positive integers.

Search results expose the selected action, root player, iteration/root-visit diagnostics, and candidate visit/value information:

```ts
interface SearchCandidate<A> {
  action: A;
  visits: number;
  value: number;
}

interface SearchResult<A> {
  action: A | null;
  rootPlayer: string;
  iterations: number;
  rootVisits: number;
  candidates: readonly SearchCandidate<A>[];
  seed?: string | number;
  elapsedMs?: number;
}
```

When search is executed on a state that is already terminal or has no legal actions available, `action` returns `null` and `candidates` is empty (`[]`). In active non-terminal states with legal actions, `action` returns the non-null selected candidate action `A`.

MCTS implementation details such as node classes and UCT bookkeeping do not leak into the game contract.

## 13. Implementation sequence

- #477 — framework-neutral search contract and Catan adapter seam.
- #478 — Catan-owned MCTS engine.
- #479 — UCT/exploration tuning.
- #480 — Catan evaluation and rollout policy.
- #481 — probability/spatial primitives.
- #482 — migrate `CatanMCTSBot`.
- #483 — migrate `MonteCatanoBot`.
- #484 — integrate `BotCoach` and remove boardgame.io.

#477 must not implement the work owned by the later issues.

## 14. Non-goals

- generic AI framework;
- generic game engine;
- MCTS implementation;
- UCT tuning;
- strategic evaluation;
- hidden-information search;
- explicit chance-node hierarchy;
- H3 or replacement spatial libraries;
- bot migration;
- boardgame.io removal.

## 15. Completion criteria for #477

- Search contract exists in Catan-owned code.
- Catan state/action adapter is framework-neutral.
- Legal actions come from the existing Catan enumerator.
- Transitions invoke existing Catan move handlers without runtime imports.
- Lifecycle and terminal semantics are centralized in Catan-owned code.
- Search randomness is explicit and deterministic.
- Input state is isolated from simulated transitions.
- Tests cover setup, gameplay, stochastic actions, robber, lifecycle, terminal conditions, stable ordering, and deterministic traces.
- No search module depends on boardgame.io, React, Redux, or browser APIs.
- `buyDevCard` is not advertised as executable until its underlying move exists.

## 16. Living-document policy

When implementation reveals a mismatch between this document and the Catan domain, change the domain seam and tests deliberately rather than allowing search-specific behavior to become a shadow rules engine. Update this document in the same change whenever a normative contract changes.
