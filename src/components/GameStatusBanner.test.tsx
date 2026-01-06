/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameStatusBanner } from './GameStatusBanner';
import { GameState } from '../game/types';
import { Ctx } from 'boardgame.io';

const mockG: GameState = {
    players: {
        '0': { color: 'red' },
        '1': { color: 'blue' }
    },
    lastRoll: [0, 0],
    lastRollRewards: {},
} as unknown as GameState;

const mockCtx: Ctx = {
    currentPlayer: '0',
    phase: 'gameplay',
    activePlayers: null,
    gameover: undefined,
} as unknown as Ctx;

describe('GameStatusBanner', () => {
    test('renders Win message with emoji', () => {
        const winCtx: Ctx = { ...mockCtx, gameover: { winner: '0' } };
        render(
            <GameStatusBanner
                G={mockG}
                ctx={winCtx}
                playerID="0"
                uiMode="viewing"
                buildMode={null}
            />
        );

        const banner = screen.getByTestId('game-status-banner');
        expect(banner).toHaveTextContent(/You Win!!!/);
        // Should contain an emoji (basic check for non-ascii or specific strings if we knew them)
        // "You Win!!!" is 10 chars.
        expect(banner.textContent?.length).toBeGreaterThan(12);
    });

    test('renders Lose message with emoji', () => {
        const loseCtx: Ctx = { ...mockCtx, gameover: { winner: '1' } };
        render(
            <GameStatusBanner
                G={mockG}
                ctx={loseCtx}
                playerID="0"
                uiMode="viewing"
                buildMode={null}
            />
        );

        const banner = screen.getByTestId('game-status-banner');
        expect(banner).toHaveTextContent(/You Lose/);
        // "You Lose" is 8 chars.
        expect(banner.textContent?.length).toBeGreaterThan(9);
    });

    test('renders Draw message with emoji', () => {
        const drawCtx: Ctx = { ...mockCtx, gameover: { draw: true } };
        render(
            <GameStatusBanner
                G={mockG}
                ctx={drawCtx}
                playerID="0"
                uiMode="viewing"
                buildMode={null}
            />
        );

        const banner = screen.getByTestId('game-status-banner');
        expect(banner).toHaveTextContent(/Draw!/);
        // "Draw!" is 5 chars.
        expect(banner.textContent?.length).toBeGreaterThan(6);
    });
});
