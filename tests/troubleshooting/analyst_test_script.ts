import { calculateBoardStats } from '../src/game/analyst';
import { Hex, TerrainType } from '../src/game/types';

console.log("Verifying Analyst Logic...");

// Mock Hexes
const mockHexes: Record<string, Hex> = {
  '1': { id: '1', coords: { q:0, r:0, s:0 }, terrain: TerrainType.Forest, tokenValue: 6 }, // Wood: 5 pips
  '2': { id: '2', coords: { q:1, r:-1, s:0 }, terrain: TerrainType.Hills, tokenValue: 8 }, // Brick: 5 pips
  '3': { id: '3', coords: { q:-1, r:1, s:0 }, terrain: TerrainType.Pasture, tokenValue: 2 }, // Sheep: 1 pip
  '4': { id: '4', coords: { q:0, r:-1, s:1 }, terrain: TerrainType.Fields, tokenValue: 12 }, // Wheat: 1 pip
  '5': { id: '5', coords: { q:0, r:1, s:-1 }, terrain: TerrainType.Mountains, tokenValue: 10 }, // Ore: 3 pips
};
// Total Pips: 5+5+1+1+3 = 15.
// Wood: 5 (33%) -> Abundance (>30%)
// Brick: 5 (33%) -> Abundance (>30%)
// Sheep: 1 (6.6%) -> Scarcity (<10%)
// Wheat: 1 (6.6%) -> Scarcity (<10%)
// Ore: 3 (20%) -> OK

const stats = calculateBoardStats(mockHexes);

// Assertions
let failed = false;

if (stats.totalPips.wood !== 5) { console.error('Wood pips wrong'); failed = true; }
if (stats.totalPips.brick !== 5) { console.error('Brick pips wrong'); failed = true; }
if (stats.totalPips.sheep !== 1) { console.error('Sheep pips wrong'); failed = true; }
if (stats.totalPips.wheat !== 1) { console.error('Wheat pips wrong'); failed = true; }
if (stats.totalPips.ore !== 3) { console.error('Ore pips wrong'); failed = true; }

// Check warnings (order doesn't matter, check existence)
const w = stats.warnings.join(' ');
if (!w.includes('Wood Abundance')) { console.error('Missing Wood Abundance warning'); failed = true; }
if (!w.includes('Sheep Scarcity')) { console.error('Missing Sheep Scarcity warning'); failed = true; }

console.log(`Fairness Score: ${stats.fairnessScore}`);

if (!failed) {
    console.log("Analyst Logic Tests: PASS");
} else {
    console.error("Analyst Logic Tests: FAIL");
    process.exit(1);
}
