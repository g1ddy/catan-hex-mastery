/**
 * Lightweight UCT Exploration Constant Benchmark Fixture (#479)
 *
 * Purpose:
 * Provides a repeatable, fast benchmark mechanism to compare candidate exploration constants
 * (C = 0.25, 0.5, 1.0, sqrt(2), 2.0) on representative Catan search states without turning CI
 * into an expensive simulation suite.
 *
 * Assumptions:
 * - Uses fixed seed ('uct-catan-benchmark-seed') for strict determinism.
 * - Iterations budget: 50 iterations per search run; maxDepth: 5.
 * - State: Setup phase initial settlement placement fixture.
 * - Evaluates candidates across root visits, top candidate action, candidate visit distribution,
 *   and maximum candidate utility value.
 */

import { CatanSearchGame } from './CatanSearchGame';
import type { CatanSearchState } from './CatanSearchState';
import type { CatanSearchAction } from './CatanSearchAction';
import { MctsEngine } from '../search/MctsEngine';
import { UctSelectionPolicy } from '../search/UctSelectionPolicy';
import { createMockGameState, createTestPlayer } from '../../testUtils';
import { GameContext, TerrainType } from '../../core/types';
import { PHASES, STAGES } from '../../core/constants';
import { generateBoard } from '../../generation/boardGen';

function createBenchmarkSetupState(): CatanSearchState {
  const { hexes, ports } = generateBoard();
  const desertHex = Object.values(hexes).find((h) => h.terrain === TerrainType.Desert);
  const game = createMockGameState({
    board: { hexes, ports, vertices: {}, edges: {} },
    players: {
      '0': createTestPlayer('0', { victoryPoints: 0 }),
      '1': createTestPlayer('1', { victoryPoints: 0 }),
    },
    robberLocation: desertHex?.id || '0',
    setupPhase: { activeRound: 1 },
    setupOrder: ['0', '1', '1', '0'],
  });

  const context: GameContext = {
    currentPlayer: '0',
    turn: 1,
    phase: PHASES.SETUP,
    stagesByPlayer: { '0': STAGES.PLACE_SETTLEMENT },
    numPlayers: 2,
    gameover: null,
  };

  return { game, context };
}

export interface UctBenchmarkMetrics {
  explorationConstant: number;
  selectedActionMove: string | null;
  selectedActionArg: string | null;
  candidatesCount: number;
  topCandidateVisits: number;
  topCandidateValue: number;
  visitEntropy: number;
  elapsedMs: number;
}

export function runUctBenchmark(
  cValues: number[] = [0.25, 0.5, 1.0, Math.SQRT2, 2.0],
  iterations = 50,
  maxDepth = 5,
  seed: string | number = 'uct-catan-benchmark-seed'
): UctBenchmarkMetrics[] {
  const catanGame = new CatanSearchGame();
  const initialState = createBenchmarkSetupState();
  const results: UctBenchmarkMetrics[] = [];

  for (const C of cValues) {
    const policy = new UctSelectionPolicy<CatanSearchState, CatanSearchAction>({
      explorationConstant: C,
    });
    const engine = new MctsEngine<CatanSearchState, CatanSearchAction>({
      selectionPolicy: policy,
    });

    const res = engine.search(catanGame, initialState, {
      iterations,
      maxDepth,
      seed,
    });

    const candidates = res.candidates;
    const topCandidate = [...candidates].sort((a, b) => b.visits - a.visits)[0];

    // Calculate visit entropy: H = - sum( p_i * log2(p_i) ) to quantify exploration spread
    const totalVisits = res.rootVisits;
    let entropy = 0;
    if (totalVisits > 0) {
      for (const c of candidates) {
        if (c.visits > 0) {
          const p = c.visits / totalVisits;
          entropy -= p * Math.log2(p);
        }
      }
    }

    const firstArg =
      res.action && 'args' in res.action && Array.isArray(res.action.args) && res.action.args.length > 0
        ? String(res.action.args[0])
        : null;

    results.push({
      explorationConstant: C,
      selectedActionMove: res.action?.move ?? null,
      selectedActionArg: firstArg,
      candidatesCount: candidates.length,
      topCandidateVisits: topCandidate?.visits ?? 0,
      topCandidateValue: topCandidate?.value ?? 0,
      visitEntropy: entropy,
      elapsedMs: res.elapsedMs ?? 0,
    });
  }

  return results;
}

describe('UCT Exploration Constant Catan Benchmark Suite', () => {
  it('runs benchmark across candidate C values deterministically and records comparable metrics', () => {
    const candidateCValues = [0.25, 0.5, 1.0, Math.SQRT2, 2.0];
    const metrics = runUctBenchmark(candidateCValues, 50, 5, 'uct-benchmark-seed-777');

    expect(metrics).toHaveLength(5);

    for (const m of metrics) {
      expect(m.selectedActionMove).toBe('placeSettlement');
      expect(m.selectedActionArg).not.toBeNull();
      expect(m.candidatesCount).toBeGreaterThan(0);
      expect(m.topCandidateVisits).toBeGreaterThan(0);
      expect(Number.isNaN(m.topCandidateValue)).toBe(false);
      expect(Number.isNaN(m.visitEntropy)).toBe(false);
    }

    // High C (2.0) should generally result in higher visit entropy (more exploration spread) than very low C (0.25)
    const lowCMetric = metrics.find((m) => m.explorationConstant === 0.25)!;
    const highCMetric = metrics.find((m) => m.explorationConstant === 2.0)!;

    expect(highCMetric.visitEntropy).toBeGreaterThanOrEqual(lowCMetric.visitEntropy);
  });

  it('produces identical benchmark results for identical seed and state', () => {
    const candidateCValues = [0.5, Math.SQRT2];
    const metricsRun1 = runUctBenchmark(candidateCValues, 40, 4, 'repeatable-benchmark-seed');
    const metricsRun2 = runUctBenchmark(candidateCValues, 40, 4, 'repeatable-benchmark-seed');

    // Remove elapsedMs before strict comparison
    const sanitize = (list: UctBenchmarkMetrics[]) => list.map((m) => ({ ...m, elapsedMs: 0 }));
    expect(sanitize(metricsRun1)).toEqual(sanitize(metricsRun2));
  });
});
