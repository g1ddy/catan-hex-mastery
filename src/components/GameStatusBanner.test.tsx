/** @jest-environment jsdom */
import { render, screen, act } from '@testing-library/react';
import { GameStatusBanner } from './GameStatusBanner';
import { GameState, RollStatus } from '../game/types';
import { PHASES, STAGES } from '../game/constants';
import { Ctx } from 'boardgame.io';
import '@testing-library/jest-dom';

describe('GameStatusBanner', () => {
    const mockG: GameState = {
        board: { hexes: {}, vertices: {}, edges: {} },
        players: {
            '0': { id: '0', color: 'red', resources: {}, settlements: [], roads: [], victoryPoints: 0 }
        },
        setupPhase: { activeRound: 1 },
        setupOrder: ['0'],
        lastRoll: [0, 0],
        boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
        rollStatus: RollStatus.IDLE,
        notification: null,
    } as unknown as GameState;

    const mockCtx = {
        phase: PHASES.SETUP,
        activePlayers: { '0': STAGES.PLACE_SETTLEMENT },
        currentPlayer: '0',
    } as unknown as Ctx;

    const props = {
        G: mockG,
        ctx: mockCtx,
        playerID: '0',
        uiMode: 'viewing' as const,
        buildMode: null,
    };

    test('renders setup instruction', () => {
        const setupProps = { ...props, uiMode: 'placing' as const };
        render(<GameStatusBanner {...setupProps} />);
        expect(screen.getByText('Place Settlement')).toBeInTheDocument();
    });

    test('renders wait instruction for inactive player', () => {
        // Player 1 when it's Player 0's turn
        const setupProps = { ...props, playerID: '1', uiMode: 'placing' as const };
        render(<GameStatusBanner {...setupProps} />);
        expect(screen.getByText('Wait for your turn...')).toBeInTheDocument();
    });

    test('renders gameplay instruction', () => {
         const gameplayCtx = { ...mockCtx, phase: PHASES.GAMEPLAY, activePlayers: { '0': STAGES.ACTING } };
         const gameplayProps = { ...props, ctx: gameplayCtx, buildMode: 'road' as const };
         render(<GameStatusBanner {...gameplayProps} />);
         expect(screen.getByText('Place Road')).toBeInTheDocument();
    });

    test('renders Win message', () => {
        const gameOverCtx = { ...mockCtx, gameover: { winner: '0' } };
        const gameOverProps = { ...props, ctx: gameOverCtx };
        render(<GameStatusBanner {...gameOverProps} />);
        // Use regex to match text + emoji
        expect(screen.getByText(/You Win!!!/)).toBeInTheDocument();
    });

    test('renders Lose message', () => {
        const gameOverCtx = { ...mockCtx, gameover: { winner: '1' } };
        const gameOverProps = { ...props, ctx: gameOverCtx };
        render(<GameStatusBanner {...gameOverProps} />);
        // Use regex to match text + emoji
        expect(screen.getByText(/You Lose/)).toBeInTheDocument();
    });

    test('renders Draw message', () => {
        const gameOverCtx = { ...mockCtx, gameover: { draw: true } };
        const gameOverProps = { ...props, ctx: gameOverCtx };
        render(<GameStatusBanner {...gameOverProps} />);
        // Use regex to match text + emoji
        expect(screen.getByText(/Draw!/)).toBeInTheDocument();
    });

    test('calls onCustomMessageClear after timeout', () => {
        jest.useFakeTimers();
        const onCustomMessageClear = jest.fn();
        const customProps = {
            ...props,
            customMessage: { text: 'Test Message', type: 'success' } as const,
            onCustomMessageClear,
            customMessageDuration: 1000
        };

        render(<GameStatusBanner {...customProps} />);

        // Should show message immediately
        expect(screen.getByText('Test Message')).toBeInTheDocument();

        // Should not have called clear yet
        expect(onCustomMessageClear).not.toHaveBeenCalled();

        // Advance timer
        act(() => {
            jest.advanceTimersByTime(1000);
        });

        expect(onCustomMessageClear).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
    });

    test('renders custom message with error styling', () => {
        const customProps = {
            ...props,
            customMessage: { text: 'Error Occurred', type: 'error' } as const,
        };
        render(<GameStatusBanner {...customProps} />);
        const message = screen.getByText('Error Occurred');
        expect(message).toBeInTheDocument();
        expect(message).toHaveClass('text-red-400');
    });
});
