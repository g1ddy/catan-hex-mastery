
/** @jest-environment jsdom */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { GameStatusBanner } from '../src/components/GameStatusBanner';
import { GameState } from '../src/game/types';
import { PHASES, STAGES } from '../src/game/constants';
import { Ctx } from 'boardgame.io';
import '@testing-library/jest-dom';

// Mock Lucide icons for ProductionToast
jest.mock('lucide-react', () => ({
    Loader2: () => <div data-testid="icon-loader" />,
    Trees: () => <div data-testid="icon-trees" />,
    BrickWall: () => <div data-testid="icon-brick" />,
    Wheat: () => <div data-testid="icon-wheat" />,
    Mountain: () => <div data-testid="icon-mountain" />,
    Cloud: () => <div data-testid="icon-cloud" />,
}));

describe('GameStatusBanner', () => {
    const mockG: GameState = {
        board: { hexes: {}, vertices: {}, edges: {} },
        players: {
            '0': { id: '0', color: 'red', resources: {}, settlements: [], roads: [], victoryPoints: 0 }
        },
        setupPhase: { activeRound: 1, activeSettlement: null },
        setupOrder: ['0'],
        lastRoll: [0, 0],
        lastRollRewards: {},
        boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
        hasRolled: false,
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
        expect(screen.getByText('Place a Settlement')).toBeInTheDocument();
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
         expect(screen.getByText('Place a Road')).toBeInTheDocument();
    });

    test('renders roll result temporarily', () => {
        jest.useFakeTimers();
        // Initially no roll
        const { rerender } = render(<GameStatusBanner {...props} />);
        expect(screen.queryByText(/Roll:/)).not.toBeInTheDocument();

        // Simulate roll
        const rolledG = { ...mockG, lastRoll: [3, 4] as [number, number], lastRollRewards: { '0': { wood: 1 } } };
        rerender(<GameStatusBanner {...props} G={rolledG} />);

        expect(screen.getByText('Roll: 7')).toBeInTheDocument();

        // Fast-forward time to check it disappears
        act(() => {
            jest.advanceTimersByTime(4000);
        });

        expect(screen.queryByText(/Roll:/)).not.toBeInTheDocument();
        jest.useRealTimers();
    });
});
