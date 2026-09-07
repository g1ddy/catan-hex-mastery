/** @jest-environment jsdom */
import { isValidElement } from 'react';
import { PHASES, STAGES } from '../../game/core/constants';
import type { GameScreenProps } from '../../features/game/GameScreen';
import type { GameState } from '../../game/core/types';
import { BoardgameView, BoardgameViewProps } from './BoardgameView';
import { toGameContext } from './boardgameMoves';

jest.mock('../../features/game/GameScreen', () => ({ GameScreen: () => null }));

const boardProps = (currentPlayer: string, onPlayerChange: (playerID: string) => void): BoardgameViewProps => ({
  G: {} as GameState,
  ctx: {
    currentPlayer,
    turn: 2,
    phase: PHASES.SETUP,
    activePlayers: { [currentPlayer]: STAGES.PLACE_SETTLEMENT },
    numPlayers: 3,
  },
  moves: {},
  playerID: '0',
  onPlayerChange,
} as unknown as BoardgameViewProps);

describe('BoardgameView runtime adapter', () => {
  it('translates framework lifecycle names into typed Catan concepts', () => {
    const context = toGameContext(boardProps('1', jest.fn()).ctx);

    expect(context).toMatchObject({
      currentPlayer: '1',
      phase: PHASES.SETUP,
      stagesByPlayer: { '1': STAGES.PLACE_SETTLEMENT },
      numPlayers: 3,
    });
    expect('activePlayers' in context).toBe(false);
  });

  it('forwards hotseat player changes when snake draft advances to the next human', () => {
    let authenticatedPlayer = '0';
    const changePlayer = (playerID: string) => { authenticatedPlayer = playerID; };
    const view = BoardgameView(boardProps('1', changePlayer));

    expect(isValidElement<GameScreenProps>(view)).toBe(true);
    if (!isValidElement<GameScreenProps>(view)) throw new Error('Expected GameScreen element');

    expect(view.props.ctx.stagesByPlayer).toEqual({ '1': STAGES.PLACE_SETTLEMENT });
    view.props.onPlayerChange?.(view.props.ctx.currentPlayer);
    expect(authenticatedPlayer).toBe('1');
  });
});
