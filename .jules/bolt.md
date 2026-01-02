## 2024-01-02 - String Parsing in Render Loops
**Learning:** Parsing strings (splitting, re-joining) inside high-frequency render loops (O(N) where N is number of game pieces) kills performance.
**Action:** Replace string-based ID logic with geometric calculation (O(1)) where possible. Pre-calculate lookup tables for geometry.
