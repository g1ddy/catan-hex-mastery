## 2024-05-23 - Render Optimization for HexOverlays

**Learning:**
I discovered that `HexOverlays` was calculating the full board's settlement scores (`getAllSettlementScores`) inside its own `useMemo` hook. Because `HexOverlays` is rendered for *each* of the 19 hexes, and the dependencies (like `G`) change on every move, this expensive O(Vertices) calculation was running 19 times per render frame instead of once.

**Action:**
I lifted the calculation to the parent `Board` component, wrapped it in `useMemo` there, and passed the result (`coachData`) down to `HexOverlays`. This reduces the complexity from O(Hexes * Vertices) to O(Vertices) per render.
**Takeaway:**
When a child component in a list/grid performs a calculation based on global state (like `G`), always check if that calculation is actually identical for all children. If so, lift it to the parent.
