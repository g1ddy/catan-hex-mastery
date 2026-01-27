## 2024-01-02 - String Parsing in Render Loops
**Learning:** Parsing strings (splitting, re-joining) inside high-frequency render loops (O(N) where N is number of game pieces) kills performance.
**Action:** Replace string-based ID logic with geometric calculation (O(1)) where possible. Pre-calculate lookup tables for geometry.

## 2024-05-23 - JSON Serialization in Tooltips
**Learning:** `JSON.stringify` inside render loops (e.g. for tooltip content) adds significant overhead, especially when multiplied by the number of interactive elements (vertices/edges).
**Action:** Pass IDs instead of serialized objects. Perform lookups in the tooltip's render callback or use a state manager.

## 2024-10-24 - Hoisting Global Calculations from List Items
**Learning:** Calling hooks that scan the entire game state (e.g., `useBoardInteractions`) inside a list item component (e.g., `HexOverlays`) causes O(N) redundant calculations on every render.
**Action:** Lift the calculation to the parent list container (`BoardLayer`) and pass the result down. Use granular checks in `React.memo`'s comparison function to prevent re-renders when the global result changes but the local item is unaffected.
