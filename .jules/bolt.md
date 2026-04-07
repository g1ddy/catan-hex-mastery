## 2024-01-02 - String Parsing in Render Loops
**Learning:** Parsing strings (splitting, re-joining) inside high-frequency render loops (O(N) where N is number of game pieces) kills performance.
**Action:** Replace string-based ID logic with geometric calculation (O(1)) where possible. Pre-calculate lookup tables for geometry.

## 2024-05-23 - JSON Serialization in Tooltips
**Learning:** `JSON.stringify` inside render loops (e.g. for tooltip content) adds significant overhead, especially when multiplied by the number of interactive elements (vertices/edges).
**Action:** Pass IDs instead of serialized objects. Perform lookups in the tooltip's render callback or use a state manager.

## 2024-10-24 - Hoisting Global Calculations from List Items
**Learning:** Calling hooks that scan the entire game state (e.g., `useBoardInteractions`) inside a list item component (e.g., `HexOverlays`) causes O(N) redundant calculations on every render.
**Action:** Lift the calculation to the parent list container (`BoardLayer`) and pass the result down. Use granular checks in `React.memo`'s comparison function to prevent re-renders when the global result changes but the local item is unaffected.

## 2025-01-29 - Stable Event Handlers in Large Lists
**Learning:** Passing inline arrow functions (e.g., `onClick={() => action(id)}`) to memoized list items (`OverlayVertex`, `OverlayEdge`) breaks `React.memo` optimization because the function reference changes on every parent render. This forces hundreds of SVG elements to re-render unnecessarily even when their props haven't changed.
**Action:** Use a `useRef` to hold the latest mutable state (e.g., `G`, `ctx`) and a stable `useCallback` handler that reads from the ref. This allows the handler identity to remain constant across renders while still accessing fresh state, preserving `React.memo` benefits.

## 2025-02-03 - Object Literals in Render Loops Break Memoization
**Learning:** Passing derived data as new object literals (e.g., `recommendation={{ color, ... }}`) to memoized list items (`OverlayVertex`) defeats `React.memo` because the object reference changes on every parent render.
**Action:** Flatten derived data into individual primitive props (e.g., `recommendationColor`, `isRecommended`) so `React.memo` can perform efficient shallow comparisons.

## 2025-02-17 - Reference Equality on Large Derived Objects
**Learning:** Checking strict reference equality (`prev.coachData !== next.coachData`) inside a custom memoization function for list items (`HexOverlays`) forces an O(N) re-render of all items when the derived object regenerates, completely defeating the memoization.
**Action:** Use granular checks for the specific slice of the derived object that the item depends on (e.g., checking `coachData.top3Set.has(id)` instead of the whole object reference).
## 2025-02-17 - Render Loop Array Chains\n**Learning:** Chaining array methods like `.map().find()` inside hot render loops (e.g. iterating over edges) causes unnecessary intermediate array allocations, increasing GC pressure.\n**Action:** Replace chained array methods with simple `for...of` loops with early `break` statements when finding a single value in a render loop.\n\n## 2025-02-17 - Render Loop Variable Hoisting\n**Learning:** Calculating invariant boolean logic (like `ctx.phase === PHASES.SETUP`) inside high-frequency map functions (like vertex rendering) causes N redundant calculations per render.\n**Action:** Always hoist invariant variables outside of the map block before iterating over elements.
