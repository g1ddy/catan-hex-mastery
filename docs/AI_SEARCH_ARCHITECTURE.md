# Catan AI Search Architecture

**Status:** Normative design for #477 and the AI/search work underneath #471.

**Source of truth:** This document defines the durable architecture and implementation contract for the Catan-owned search stack. Follow-up issues should reference this document rather than restating the same design in large issue bodies.

**Primary issue:** #477 — Define a framework-neutral search contract for Catan AI

**Parent epic:** #471 — Build a Catan-owned AI search and decision engine

---

## 1. Decision summary

Catan Hex Mastery will own a small framework-neutral search contract and a Catan-specific adapter around it.

The core search layer will not know about React, Redux Toolkit, boardgame.io, `Ctx`, boardgame.io `State`, or any runtime-specific action envelope. It will operate on an opaque state `S` and action `A` through a small `SearchGame<S, A>` contract.

For Catan, the search state is a composition of the existing Catan domain state and the framework-neutral lifecycle context:

```ts
interface CatanSearchState {
  game: GameState;
  context: GameContext;
}
```

The search action is the canonical Catan command, not a runtime dispatch wrapper. The existing `BotMove` shape is the intended starting representation:

```ts
interface BotMove {
  move: keyof MoveArguments;
  args: MoveArguments[keyof MoveArguments];
}
```

The exact implementation may introduce a more precise `CatanSearchAction` alias/type, but search must not carry Redux-style `MakeMoveAction` payloads or boardgame.io action types.

The generic contract is intentionally smaller than a game framework:

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

Evaluation, rollout policy, and UCT/search-policy behavior are injected around this contract. They do not belong inside `SearchGame`.

This separation is the key architectural seam between Catan rules/runtime and the MCTS implementation.

---

## 2. Why this contract exists

The current bots inherit from the boardgame.io `MCTSBot` and accept boardgame.io `Game`/`Ctx` objects. `CatanMCTSBot` currently supplies the framework enumerator through an adapter and configures 100 iterations with a 10-ply rollout depth. `MonteCatanoBot` does the same while adding Catan-specific pip, resource-synergy, city, and road objectives.

That makes the current implementation a mixture of responsibilities:

- boardgame.io runtime integration;
- legal Catan move enumeration;
- state transition semantics;
- random simulation;
- tree search;
- UCT policy;
- Catan strategic evaluation;
- rollout policy; and
- bot configuration.

The goal of #477 is not to clean up every one of those concerns at once. It establishes the narrow contract that lets each later issue own one concern without recreating the boardgame.io architecture.

The existing Catan domain already has useful framework-neutral types and rule machinery. `GameState`, `GameContext`, `GameAction`/`BotMove`, `GameRandom`, move handlers, validation, queries, and enumeration are all Catan-owned. The missing piece is a search-facing composition that can simulate them without requiring a live framework runtime.

---

## 3. Research basis

### 3.1 MCTS architecture

The classic MCTS loop is conventionally decomposed into selection, expansion, simulation/playout, and backpropagation. The broad literature treats the search mechanism as a reusable algorithm while allowing domain-specific knowledge to influence simulation policy, tree statistics, or evaluation.

The 2012 survey by Browne et al. remains the useful baseline reference for the core algorithm and its families of enhancements. The important architectural implication for this repository is that the engine should expose seams for policy/evaluation without forcing the game domain to depend on the search implementation.

Reference: Browne et al., *A Survey of Monte Carlo Tree Search Methods*, IEEE Transactions on Computational Intelligence and AI in Games, 2012.

### 3.2 Catan-specific MCTS research

Szita, Chaslot, and Spronck applied MCTS directly to multiplayer, stochastic Settlers of Catan. Their work is particularly relevant to this project because they found that useful Catan domain knowledge can be introduced in at least two distinct places: the Monte-Carlo simulation policy and the tree-search statistics. They also observed that naive/random simulation is weak and that overly deterministic heuristic sampling can become too selective.

That supports keeping the MCTS engine generic while injecting Catan-specific rollout/evaluation behavior separately. It also argues against burying the current `MonteCatanoBot` heuristic thresholds inside the tree implementation.

Reference: Szita, Chaslot, Spronck, *Monte-Carlo Tree Search in Settlers of Catan*, ACG 2009 / Springer, 2010.

### 3.3 Game-state contracts

OpenSpiel provides a useful comparison point because it explicitly separates game/state concerns: the game exposes state transitions, legal actions, current player, terminal state, and chance behavior; the search algorithms operate on that model rather than on a UI/runtime object. It also provides a `clone`/`child` concept for simulation state and distinguishes decision/chance/terminal state types.

This repository should adopt the separation principle, but not copy OpenSpiel's full abstraction surface. Catan Hex Mastery needs only the smallest contract required by the current game and future AI work.

References:

- OpenSpiel state API: `current_player`, `legal_actions`, `apply_action`, `clone`, `child`, and terminal/chance state types.
- OpenSpiel overview: sequential and stochastic games, including multiplayer and general-sum settings.

### 3.4 Deterministic simulation

Search and simulation need reproducibility for tests, debugging, coaching diagnostics, and regression comparisons. A seeded random source should therefore be explicit and local to the search execution rather than obtained from framework state or global `Math.random()`.

Determinism should mean that the same search input, configuration, implementation version, and seed reproduce the same search decisions and simulation trace. It does not imply that a seed must produce identical results across future algorithm revisions.

---

## 4. Design principles

### 4.1 Catan owns the search seam

There is no intent to introduce a reusable game-AI framework. The types live in Catan-owned code and are shaped around the needs of this repository.

A generic-looking type such as `SearchGame<S, A>` is acceptable because it keeps the search engine independent of Catan's concrete state, not because the repository is building a general framework for arbitrary games.

### 4.2 Search consumes domain commands

A search action represents "what Catan move should happen?", not "how does the current runtime dispatch that move?"

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

For Catan today, that means the domain `GameState` plus the framework-neutral `GameContext` lifecycle state.

Do not duplicate the contents of `GameState` into another AI-specific state model merely to satisfy the search API.

### 4.4 Simulation state must be isolated from live game state

MCTS must never mutate the live application state while exploring hypothetical futures.

The contract therefore presents `applyAction` as a state-producing operation:

```ts
nextState = game.applyAction(state, action, random);
```

The implementation may use mutable internals for performance, but the search-facing semantic guarantee is that the input state is not mutated as an observable side effect.

The Catan runtime work in #470 should eventually provide the authoritative deterministic transition mechanism. The search adapter should consume that transition mechanism rather than reimplementing move execution.

### 4.5 Randomness is explicit

No search module may reach directly into:

- `Math.random()`;
- a module-global mutable RNG;
- boardgame.io random helpers; or
- React/runtime state to obtain randomness.

The seeded random source is supplied by the caller/search execution and passed into stochastic state transitions and rollout decisions.

### 4.6 Evaluation is not part of the game contract

`SearchGame` answers rules questions: what can happen, what state results, and whether the game is over.

An evaluator answers strategy questions: how good is a non-terminal state for a player?

Keeping those separate allows:

- the MCTS engine to remain ignorant of Catan strategy;
- `CatanEvaluation` to evolve without changing the search contract;
- multiple bot personalities to share the same engine; and
- `BotCoach` to reuse evaluation/diagnostics without becoming an MCTS implementation.

### 4.7 Multiplayer values are explicit

Catan is a multiplayer competitive game, not a two-player zero-sum game. A single scalar whose meaning silently flips perspective at every node makes correctness harder to reason about.

The preferred search value model is a per-player utility vector with normalized values in `[0, 1]`:

```ts
type PlayerId = string;
type SearchUtility = Readonly<Record<PlayerId, number>>;
```

Terminal mapping for the first implementation:

- winner: `1` for the winner, `0` for other players;
- draw: `0.5` for every player;
- non-terminal heuristic evaluation: bounded values in `[0, 1]` for every player.

The exact strategic evaluation formula is owned by #480. The contract only establishes the value semantics.

The MCTS node may cache aggregate per-player value totals, allowing UCT selection at a node to inspect the utility for the player making the decision there. The root result is reported from the root player's perspective.

### 4.8 Chance remains a game concern

Catan contains stochastic outcomes such as dice. The search contract does not require a separate explicit chance-node hierarchy for the first implementation.

Instead, stochastic Catan actions such as `rollDice` can consume `SearchRandom` during `applyAction`. This keeps the contract small while still making stochastic simulation deterministic and reproducible.

A future explicit chance-node model would be a separate architectural change, not something to smuggle into #477.

### 4.9 Perfect information is the current assumption

The current `GameState` exposes the information the existing bots use, including players' resources and board state. The first Catan-owned search stack therefore targets the current perfect-information representation.

Do not add an information-set/hidden-information framework in #477. If hidden development-card information becomes a real modeled concern later, an observation/information-state contract can be added deliberately.

---

## 5. Normative contract

The following is the conceptual contract. Exact TypeScript names may change during implementation, but the semantics are normative.

### 5.1 `SearchGame<S, A>`

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

#### `getCurrentPlayer`

Returns the player whose decision is represented by the state.

Rules:

- return a stable Catan player ID;
- do not return a boardgame.io player object or `Ctx`;
- the result must agree with the lifecycle state used by legal move enumeration.

#### `getLegalActions`

Returns every legal Catan command for the acting player in the supplied state.

Rules:

- legal means the action can actually be executed from this state;
- return canonical, deterministic action objects;
- do not expose runtime dispatch envelopes;
- preserve parameterized moves such as settlement/road placement and robber victim choices;
- avoid silently dropping legal options merely because a rollout policy does not prefer them.

For the existing repository, this should build on the Catan-owned rule enumerator rather than duplicate legality logic.

#### `applyAction`

Applies a canonical action and returns the resulting search state.

Rules:

- do not mutate the input state from the caller's perspective;
- use the Catan runtime/domain transition path rather than calling boardgame.io directly;
- pass the explicit search RNG into stochastic transitions;
- produce a state that is immediately valid for the next search step;
- preserve enough lifecycle state to allow the next `getLegalActions` call.

During the transition away from boardgame.io, any temporary adapter required to invoke existing move handlers belongs outside the search engine and must be treated as migration glue.

#### `isTerminal`

Answers only whether the supplied search state represents a game-over condition.

It should not infer strategy or utility.

#### `getTerminalResult`

Returns the terminal outcome when terminal, otherwise `null`.

Recommended shape:

```ts
type SearchTerminalResult =
  | { kind: 'winner'; winnerId: string }
  | { kind: 'draw' };
```

The implementation should derive this from the Catan-owned runtime/game-over semantics. It should not duplicate winner rules in the search engine.

#### `getPlayers`

Returns the participating player IDs in stable order.

Stable ordering matters for deterministic aggregation and test fixtures.

---

## 6. `SearchRandom`

The search stack needs a tiny deterministic RNG abstraction, not a replacement for every random-number API in the application.

Conceptual shape:

```ts
interface SearchRandom {
  next(): number;                 // [0, 1)
  integer(maxExclusive: number): number;
  pick<T>(values: readonly T[]): T;
  die(sides: number): number;     // 1..sides
}
```

Rules:

- all methods are deterministic for a fixed seed and call sequence;
- `next()` returns a value in `[0, 1)`;
- `integer(n)` returns `0..n-1` and rejects non-positive bounds;
- `pick` uses the seeded source and rejects an empty input;
- `die(sides)` returns `1..sides`;
- no method mutates caller-owned collections;
- shuffling, where required by rollout policy, may be implemented using the same source rather than exposing a large general-purpose random API.

A seed may be represented as `string | number` at the public bot boundary. Internally, normalize it into the chosen deterministic generator.

A useful implementation property is that `SearchRandom` has no knowledge of Catan. The Catan game adapter decides what a random draw means.

### RNG ownership

The search invocation owns the RNG instance. The Catan transition function consumes it when the game itself is stochastic. Rollout policy uses the same explicit source for action sampling.

Do not use separate hidden random streams in #477 unless a concrete reproducibility problem requires them. A single explicit stream keeps execution straightforward and traceable.

---

## 7. Catan search state

The first Catan implementation should compose existing types rather than create an AI-only mirror of game state.

```ts
interface CatanSearchState {
  game: GameState;
  context: GameContext;
}
```

This composition is intentional:

- `GameState` owns the board, players, resources, robber, roll, and domain events;
- `GameContext` owns current player, turn, phase, active stages, player count, and game-over state;
- the search state owns neither concept; it simply packages what simulation needs.

### Why not put context into `GameState`?

#470 explicitly keeps game-domain state distinct from runtime/lifecycle state where that separation remains useful. The search boundary should respect that distinction rather than collapse two existing concepts solely for MCTS.

### Why not define `CatanSearchState` as an intersection?

A nested composition is clearer and avoids accidental collisions between future domain fields and lifecycle fields:

```ts
{ game, context }
```

It also makes it obvious to an implementation that both portions must advance together.

---

## 8. Catan search action

The search action should be the smallest canonical Catan command already recognized by Catan rules.

The existing `BotMove` is the closest match:

```ts
type BotMove = {
  [K in keyof MoveArguments]: {
    move: K;
    args: MoveArguments[K];
  }
}[keyof MoveArguments];
```

The existing `GameAction` union also includes `MakeMoveAction`, which is useful at application boundaries but is not the desired search representation.

Therefore:

```ts
type CatanSearchAction = BotMove;
```

is preferred over:

```ts
type CatanSearchAction = GameAction;
```

unless implementation evidence shows a strong reason to introduce a separate domain-command type.

This prevents search from learning about Redux-style payload structure merely because both the bot and UI currently use the broader `GameAction` union.

---

## 9. Evaluation contract

The evaluation layer is injected into search and has access to Catan state, players, and existing domain-analysis primitives.

Conceptual shape:

```ts
interface SearchEvaluator<S> {
  evaluate(state: S): SearchUtility;
}
```

The evaluator must not execute moves, mutate state, or depend on UI/runtime objects.

For Catan, #480 owns the concrete evaluation policy. Initial components are expected to include signals such as:

- current Victory Points and game progress;
- expected resource production;
- resource diversity/synergy;
- city and settlement development;
- road/expansion potential;
- settlement opportunities;
- port access;
- spatial position;
- blocking/opponent pressure.

The evaluator should be compositional so individual signals can be tested and tuned independently.

### Terminal vs non-terminal evaluation

Terminal outcomes should be authoritative and should not be overwritten by a heuristic evaluator.

A search implementation should follow this order:

1. detect terminal state;
2. map terminal result to utility vector;
3. otherwise use the injected non-terminal evaluator when the search policy requires a heuristic value;
4. otherwise continue rollout.

---

## 10. Rollout policy contract

Rollout policy is separate from both game mechanics and tree selection.

Conceptual shape:

```ts
interface RolloutPolicy<S, A> {
  chooseAction(
    state: S,
    legalActions: readonly A[],
    random: SearchRandom,
  ): A;
}
```

The first stack should support at least:

1. **Random rollout** — uniform legal action selection; useful as a correctness baseline.
2. **Catan-weighted rollout** — domain-aware action weighting without hard-coding the weighting inside MCTS.

Szita et al.'s Catan work is strong evidence for keeping this seam explicit: completely random play is weak, but overly deterministic heuristic sampling can also harm exploration. citeturn890039search0

---

## 11. Search configuration

#477 should define only the configuration that must be shared by bots/Coach and needed to execute a search, while MCTS-specific tuning belongs to #478/#479.

Conceptual shared configuration:

```ts
interface SearchConfig {
  iterations: number;
  maxDepth: number;
  seed?: string | number;
}
```

MCTS-specific configuration may extend this later with:

- UCT exploration constant;
- rollout policy;
- evaluator;
- final root-action selection policy;
- optional diagnostics controls.

Do not put UCT's exploration constant into the base framework-neutral contract unless implementation evidence shows another search algorithm needs the same concept. #479 owns that decision.

### Validation

Search configuration should fail fast for invalid budgets:

- iterations must be a positive integer;
- max depth must be a positive integer when enabled;
- seed normalization must be deterministic;
- optional time budgets, if introduced later, must not silently override a requested deterministic iteration budget.

---

## 12. Search result contract

`BotCoach` needs enough information to explain and compare search decisions without knowing the internal tree representation.

Conceptual shape:

```ts
interface SearchCandidate<A> {
  action: A;
  visits: number;
  value: number;
}

interface SearchResult<A> {
  action: A;
  rootPlayer: string;
  iterations: number;
  rootVisits: number;
  candidates: readonly SearchCandidate<A>[];
  seed?: string | number;
  elapsedMs?: number;
}
```

`value` is reported from the root player's perspective and should use the same normalized utility semantics as the search engine.

Diagnostics such as tree size or raw node statistics can be added later, but the contract should avoid exposing concrete `MctsNode` objects.

The result is deliberately suitable for coaching without turning the Coach into a search-engine implementation.

---

## 13. State-transition ownership

This is the most important interaction with #470.

### Desired direction

```text
Catan domain/rules
        |
        v
Catan runtime / deterministic transitions
        |
        v
CatanSearchGame adapter
        |
        v
MCTS / rollout / evaluation
        |
        v
Bot adapters / BotCoach
```

The search layer must not call:

```ts
boardgame.io
boardgame.io/ai
boardgame.io/client
boardgame.io/multiplayer
```

directly.

The `src/adapters/runtime/` boundary is acceptable only while runtime migration is incomplete. The long-term search stack should depend on Catan-owned transition semantics, consistent with #468 and #470.

### Temporary migration rule

If #477 implementation lands before #470 has completely removed boardgame.io runtime dependencies, use a narrow adapter in the runtime boundary. Do not let that dependency leak into `src/game/ai/**` or into the MCTS engine.

Once #470 is complete, the adapter should point entirely at the Catan-owned runtime.

---

## 14. Legal-action semantics

Legal action enumeration is authoritative.

The search engine must never infer legality from an evaluator score, resource heuristic, or action type. A rollout policy may rank or weight legal actions, but the source set must come from `getLegalActions`.

This matters particularly for Catan because a single move name can have many parameterized choices:

- settlement placement;
- city placement;
- road placement;
- robber destination;
- robber victim;
- bank trade availability.

The current Catan enumerator already expands these combinations into concrete `BotMove` actions. The search contract should preserve this representation rather than make the engine understand Catan-specific parameter domains.

---

## 15. Terminal-state semantics

A terminal result belongs to the state/game contract because it is a game rule, not a strategy preference.

For the current rules:

```text
winner exists -> terminal winner
turn limit reached -> terminal draw
otherwise -> non-terminal
```

The source of truth should remain the Catan runtime's game-over state once #470 is complete.

Do not implement a second "does someone have enough VP?" rule inside MCTS.

This prevents future rule changes from producing a split-brain game engine where live play and simulation disagree about whether a game has ended.

---

## 16. Determinism and testability

Determinism is a first-class design requirement because MCTS is otherwise difficult to regression-test.

For a fixed:

```text
initial search state
+ seed
+ search configuration
+ code version
```

we should be able to reproduce:

- the same sequence of random choices;
- the same simulated state transitions;
- the same search result;
- the same candidate visit counts/value statistics, assuming stable iteration ordering.

### Stable ordering requirement

Do not rely on JavaScript object-key insertion order as a hidden source of nondeterminism in search behavior.

Where action ordering affects tie-breaking, produce an explicit deterministic order. The same principle applies to player IDs and candidate reporting.

### Seed scope

Seeds are for reproducibility, not cryptographic randomness. The search RNG must not be shared with the live game runtime.

---

## 17. Error and invalid-state behavior

The search contract should fail clearly on programmer errors and impossible state transitions.

Recommended behavior:

- invalid search configuration -> throw/return a clear configuration error;
- empty legal-action set in a non-terminal state -> treat as a contract violation and fail loudly;
- applying an action not present in the legal-action set -> fail loudly in test/debug implementations;
- terminal state requested for action enumeration -> return an empty list or reject according to the concrete adapter contract, but choose one deterministic behavior and test it;
- unknown player ID -> fail rather than silently treating the player as an opponent.

The search engine should not silently fabricate fallback moves.

---

## 18. Architecture and dependency direction

The intended dependency direction is:

```text
src/game/core
src/game/geometry
src/game/mechanics
src/game/rules
src/game/analysis
        |
        v
src/game/ai/search
src/game/ai/mcts
src/game/ai/catan
        |
        v
src/bots
        |
        v
src/features / pages / runtime composition
```

More precisely:

- `src/game/ai/search/**` depends only on TypeScript/runtime-neutral types owned by the repository;
- `src/game/ai/mcts/**` depends on `src/game/ai/search/**`, not on UI/runtime libraries;
- Catan adapters depend on Catan rules/state/runtime contracts;
- bots configure the search stack but do not own the engine;
- BotCoach may consume search results and evaluation, but it does not become the MCTS implementation;
- React/Redux/boardgame.io stay outside the search engine.

The exact directory may evolve, but the dependency direction is the invariant.

### Recommended package layout

```text
src/game/ai/
├── search/
│   ├── SearchGame.ts
│   ├── SearchRandom.ts
│   ├── SearchResult.ts
│   └── SearchConfig.ts
├── mcts/
│   ├── MctsEngine.ts
│   ├── MctsNode.ts
│   ├── UctPolicy.ts
│   └── Backpropagation.ts
├── catan/
│   ├── CatanSearchGame.ts
│   ├── CatanEvaluation.ts
│   ├── CatanRollout.ts
│   ├── CatanProbability.ts
│   └── CatanSpatial.ts
└── index.ts
```

This is a recommended placement guide, not a mandate to create empty wrappers solely to match the tree.

---

## 19. What #477 should implement

The implementation of #477 should establish the seam and prove it with small tests.

### Required

- framework-neutral search types;
- explicit seeded random interface;
- Catan search-state composition using existing `GameState` + `GameContext`;
- canonical Catan search action representation;
- explicit multiplayer terminal result semantics;
- generic search result/config types;
- a Catan adapter implementing legal action/current-player/transition/terminal/player access;
- deterministic contract-level tests;
- architecture enforcement preventing search internals from importing framework runtime types.

### Strongly preferred

- a tiny fake/test `SearchGame` proving the generic contract without Catan or boardgame.io;
- Catan adapter tests covering setup and normal gameplay states;
- tests proving fixed seed + fixed state yields repeatable action/transition behavior;
- tests proving the live input state is not mutated by search transitions.

### Explicitly not part of #477

- MCTS tree traversal;
- UCT calculations;
- Catan strategic weighting;
- rollout strategy implementation beyond minimal contract tests;
- bot migration;
- boardgame.io package removal;
- hidden-information MCTS;
- H3 or a new spatial dependency;
- a generic AI framework intended for unrelated games.

---

## 20. Tests expected from #477

The tests should prove architecture and semantics, not exact strategic moves.

### Contract tests

Use a tiny deterministic toy `SearchGame` to verify:

1. legal actions are returned;
2. current player is stable;
3. applying an action returns the expected next state;
4. terminal results are explicit;
5. fixed seeds reproduce the same random sequence;
6. random choices are deterministic;
7. an input state remains unchanged.

### Catan adapter tests

Use small known game states to verify:

1. setup state produces the expected active player and legal placement actions;
2. normal gameplay state produces expected stage-specific legal moves;
3. a parameterized robber state expands destination/victim combinations;
4. applying a legal command advances both `GameState` and `GameContext` coherently;
5. terminal winner state reports the correct winner;
6. terminal draw state reports draw;
7. two searches from the same snapshot and seed see the same state transitions.

Do not assert that MCTS chooses a specific settlement in #477. That belongs to later algorithm/strategy tests.

---

## 21. Implementation guidance for Jules

Future coding-agent issues should reference this document and state only the issue-specific delta.

A Jules implementation should follow these rules:

### Rule 1 — Read this document first

Treat the normative sections above as the architecture contract.

### Rule 2 — Do not broaden the abstraction

Do not introduce interfaces for every class merely because MCTS libraries often contain them. Add a type only when it creates a real responsibility boundary required by the current repository.

### Rule 3 — Preserve existing Catan types

Prefer `GameState`, `GameContext`, `MoveArguments`, `BotMove`, and existing rule APIs over duplicated AI models.

### Rule 4 — Keep framework types at the edge

The search engine must compile and test without importing boardgame.io, React, Redux Toolkit, or browser runtime APIs.

### Rule 5 — Keep game rules authoritative

Do not reimplement legality, win conditions, or lifecycle rules in the MCTS engine.

### Rule 6 — Make simulation transitions explicit

Do not mutate the live application state. A search transition produces an isolated state.

### Rule 7 — Keep randomness explicit

Do not use `Math.random()` or hidden framework RNG state anywhere in the search stack.

### Rule 8 — Treat diagnostics as API, not tree internals

Expose coaching data through `SearchResult`. Do not make BotCoach understand `MctsNode`.

### Rule 9 — Prefer deterministic ordering

Stable action/player ordering is part of reproducible search behavior.

### Rule 10 — Link issue work to the architecture document

A follow-up issue can be concise when it says, for example:

> Implement the MCTS engine according to `docs/AI_SEARCH_ARCHITECTURE.md`, sections 5–18. Preserve the existing Catan contract and complete only the issue-specific work described below.

The issue should then focus on acceptance criteria unique to that implementation task.

---

## 22. Relationship to the child issues under #471

| Issue | Relationship to this document |
| --- | --- |
| #477 | Defines and implements the base search seam described here. |
| #478 | Implements MCTS against this contract. See sections 4–20, especially state isolation, value semantics, and result contract. |
| #479 | Owns UCT policy and exploration tuning. The base search contract remains unchanged unless evidence requires it. |
| #480 | Implements Catan evaluation and rollout policy using the injected seams described here. |
| #481 | Supplies reusable Catan probability/spatial primitives consumed by evaluation. |
| #482 | Migrates `CatanMCTSBot` to the Catan-owned stack while preserving its existing baseline configuration and behavior envelope. |
| #483 | Migrates `MonteCatanoBot` and its Catan-specific strategy signals onto the shared stack. |
| #484 | Integrates search into `BotCoach` and completes boardgame.io removal. |

The child issues should not redefine these architectural contracts independently.

---

## 23. Rejected alternatives

### Rebuild boardgame.io locally

Rejected. The objective is a Catan-owned deterministic runtime and search layer, not an in-house clone of a general board-game framework.

### Put `Game`, `Ctx`, and `MCTSBot` behind more aliases

Rejected. Type aliases alone would hide the dependency without changing ownership or lifecycle semantics.

### Put evaluation methods directly on `SearchGame`

Rejected. This would make the game model strategy-aware and would prevent the same transition contract from supporting different bot personalities.

### Use a scalar utility only

Rejected for the first multiplayer design. Catan's multi-player setting makes per-player utilities explicit and easier to audit.

### Introduce explicit chance nodes immediately

Deferred. The existing Catan game can represent stochastic transitions through the explicit seeded random source while keeping the first contract much smaller.

### Add H3 or another spatial library

Rejected for the search seam. Catan already has cube coordinates and native topology; spatial primitives belong in Catan analysis and should reuse the existing geometry.

### Create a generic MCTS package

Rejected. The repository needs a Catan-owned implementation, not a generalized AI product.

### Store complete runtime dispatch actions in search

Rejected. Search should reason about Catan commands, while runtime adapters translate those commands into whatever dispatch/execution mechanism is currently active.

---

## 24. Migration from the current bots

The current implementation provides useful characterization anchors:

### `CatanMCTSBot`

Current baseline:

- boardgame.io `MCTSBot` inheritance;
- framework-adapted enumerator;
- 100 iterations;
- 10-ply rollout depth;
- cumulative VP objectives.

The migrated bot should retain those baseline characteristics until later issues explicitly change them.

### `MonteCatanoBot`

Current baseline:

- boardgame.io `MCTSBot` inheritance;
- 200 iterations;
- 50-ply rollout depth;
- cumulative VP objectives;
- pip-production thresholds;
- ore/wheat and brick/wood synergy signals;
- multiple-city objective;
- road-length objective.

The migrated bot should preserve those strategic distinctions while moving the implementation to the shared Catan-owned evaluation/rollout seams.

The design explicitly avoids making either bot the owner of the MCTS engine.

---

## 25. Completion criteria for the architectural seam

The #477 design is considered successfully cemented when:

- a reviewer can understand the search boundary from this document without reading issue history;
- the MCTS implementation can be built without importing boardgame.io types;
- a Catan search state can be created from existing `GameState` and `GameContext` without duplicating the domain model;
- legal actions remain owned by Catan rules;
- transitions remain owned by the Catan runtime/domain execution path;
- stochastic behavior uses an explicit seedable source;
- terminal outcomes are explicit and multiplayer-safe;
- evaluation/rollout policy is injectable;
- search results contain enough information for BotCoach without exposing tree internals;
- deterministic contract tests exist;
- follow-up issues can refer to this document instead of restating the architecture.

---

## 26. Primary references

1. Cameron Browne et al. (2012), *A Survey of Monte Carlo Tree Search Methods*. IEEE Transactions on Computational Intelligence and AI in Games, 4(1), 1–43. DOI: 10.1109/TCIAIG.2012.2186810.
2. István Szita, Guillaume Chaslot, Pieter Spronck (2010), *Monte-Carlo Tree Search in Settlers of Catan*. In *Advances in Computer Games 12*, pp. 21–32. DOI: 10.1007/978-3-642-12993-3_3.
3. OpenSpiel documentation, Core/State API: current player, legal actions, state transitions, cloning/child states, terminal/chance state types.
4. OpenSpiel documentation, overview of sequential, stochastic, multiplayer, and general-sum game modeling.

This document records the conclusions drawn from those references for **this repository**. The references are evidence for the design choices, not requirements to reproduce OpenSpiel or a published MCTS implementation verbatim.

---

## 27. Change policy

This is a living architectural document.

Update it when the repository makes a durable change to the search contract or its ownership boundaries. Do not update it for every implementation detail, benchmark result, or issue-progress note.

When a later issue discovers that a normative decision here is wrong, update this document first or in the same change that establishes the replacement design. Then update the affected issue(s) to reference the revised section.

Keep the document focused on **what the architecture is and why**, while individual issues own **what the next implementation increment must do**.
