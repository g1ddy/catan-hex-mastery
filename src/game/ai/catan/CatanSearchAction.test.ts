import { CatanSearchGame } from './CatanSearchGame';
import { createMockGameState, createTestPlayer } from '../../testUtils';
import { PHASES, STAGES } from '../../core/constants';
import type { CatanSearchState } from './CatanSearchState';
import type { BotMove } from '../../core/types';

describe('CatanSearchAction', () => {
  it('does not expose forward-compatible but unimplemented development-card purchase', () => {
    const state: CatanSearchState = {
      game: createMockGameState({
        players: {
          '0': createTestPlayer('0'),
          '1': createTestPlayer('1'),
        },
      }),
      context: {
        currentPlayer: '0',
        turn: 1,
        phase: PHASES.GAMEPLAY,
        stagesByPlayer: { '0': STAGES.ACTING },
        numPlayers: 2,
      },
    };

    const actions = new CatanSearchGame().getLegalActions(state);

    expect((actions as BotMove[]).some(action => action.move === 'buyDevCard')).toBe(false);
  });
});
