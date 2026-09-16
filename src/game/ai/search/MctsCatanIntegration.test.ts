import { CatanSearchGame } from '../catan/CatanSearchGame';
import type { CatanSearchState } from '../catan/CatanSearchState';
import type { CatanSearchAction } from '../catan/CatanSearchAction';
import { MctsEngine } from './MctsEngine';
import { UctSelectionPolicy } from './UctSelectionPolicy';
import { createMockGameState, createTestPlayer } from '../../testUtils';
import { GameContext, TerrainType } from '../../core/types';
import { PHASES, STAGES } from '../../core/constants';
import { generateBoard } from '../../generation/boardGen';

function createMockSetupState(): CatanSearchState {
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

describe('MctsEngine Integration with CatanSearchGame Adapter', () => {
  it('runs MctsEngine search on Catan state without runtime or UI dependencies', () => {
    const catanGame = new CatanSearchGame();
    const engine = new MctsEngine<CatanSearchState, CatanSearchAction>();

    const initialState = createMockSetupState();
    const initialGameSnapshot = JSON.stringify(initialState.game);
    const initialContextSnapshot = JSON.stringify(initialState.context);

    const result = engine.search(catanGame, initialState, {
      iterations: 20,
      maxDepth: 5,
      seed: 'catan-integration-seed-123',
    });

    // Check search results
    expect(result.action).not.toBeNull();
    expect(result.action?.move).toBe('placeSettlement');
    expect(result.rootPlayer).toBe('0');
    expect(result.iterations).toBe(20);
    expect(result.rootVisits).toBe(20);
    expect(result.candidates.length).toBeGreaterThan(0);

    for (const candidate of result.candidates) {
      expect(candidate.action.move).toBe('placeSettlement');
      expect(candidate.visits).toBeGreaterThan(0);
      expect(Number.isNaN(candidate.value)).toBe(false);
    }

    // Verify input state was not mutated
    expect(JSON.stringify(initialState.game)).toBe(initialGameSnapshot);
    expect(JSON.stringify(initialState.context)).toBe(initialContextSnapshot);
  });

  it('runs MctsEngine with explicit UCT SelectionPolicy on Catan search state', () => {
    const catanGame = new CatanSearchGame();
    const uctPolicy = new UctSelectionPolicy<CatanSearchState, CatanSearchAction>({
      explorationConstant: 1.414,
    });
    const engine = new MctsEngine<CatanSearchState, CatanSearchAction>({
      selectionPolicy: uctPolicy,
    });

    const initialState = createMockSetupState();
    const result = engine.search(catanGame, initialState, {
      iterations: 30,
      maxDepth: 4,
      seed: 'catan-uct-integration-456',
    });

    expect(result.action).not.toBeNull();
    expect(result.action?.move).toBe('placeSettlement');
    expect(result.rootPlayer).toBe('0');
    expect(result.iterations).toBe(30);
    expect(result.rootVisits).toBe(30);
    expect(result.candidates.length).toBeGreaterThan(0);
  });
});
