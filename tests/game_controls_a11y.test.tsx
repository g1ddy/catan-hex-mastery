
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameControls, BuildMode, UiMode } from '../src/components/GameControls';
import { GameState } from '../src/game/types';
import { PHASES, STAGES } from '../src/game/constants';
import { Ctx } from 'boardgame.io';
import '@testing-library/jest-dom';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Dices: () => <div data-testid="icon-dices" />,
    ArrowRight: () => <div data-testid="icon-arrow-right" />,
    Loader2: () => <div data-testid="icon-loader" />,
    Trees: () => <div data-testid="icon-trees" />,
    BrickWall: () => <div data-testid="icon-brick" />,
    Wheat: () => <div data-testid="icon-wheat" />,
    Mountain: () => <div data-testid="icon-mountain" />,
    Cloud: () => <div data-testid="icon-cloud" />,
    MapPin: () => <div data-testid="icon-map-pin" />,
    Home: () => <div data-testid="icon-home" />,
    Castle: () => <div data-testid="icon-castle" />,
    Scroll: () => <div data-testid="icon-scroll" />,
}));

// Mock react-tooltip
jest.mock('react-tooltip', () => ({
    Tooltip: () => null,
}));

// Mock safeMove
jest.mock('../src/utils/moveUtils', () => ({
    safeMove: (fn: () => void) => fn(),
}));

describe('GameControls Accessibility', () => {
    const mockG: GameState = {
        board: { hexes: {}, vertices: {}, edges: {} },
        players: {
            '0': {
                id: '0',
                color: 'red',
                resources: { wood: 10, brick: 10, wheat: 10, sheep: 10, ore: 10 },
                settlements: [],
                roads: [],
                victoryPoints: 0,
            }
        },
        setupOrder: ['0'],
        lastRoll: [0, 0],
        lastRollRewards: {},
        boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
        hasRolled: true,
    } as unknown as GameState;

    const mockCtx = {
        phase: PHASES.GAMEPLAY,
        activePlayers: { '0': STAGES.ACTING },
        currentPlayer: '0',
        numPlayers: 1,
        playOrder: ['0'],
        playOrderPos: 0,
        turn: 1,
        gameover: undefined,
    } as unknown as Ctx;

    const mockMoves = {
        rollDice: jest.fn(),
        endTurn: jest.fn(),
    };

    const props = {
        G: mockG,
        ctx: mockCtx,
        moves: mockMoves,
        playerID: '0',
        buildMode: null as BuildMode,
        setBuildMode: jest.fn(),
        uiMode: 'viewing' as UiMode,
        setUiMode: jest.fn(),
    };

    test('Setup InstructionDisplay has accessibility attributes', () => {
        // Mock G such that settlements == roads (0 == 0), implying "Place Settlement"
        const setupG = {
            ...mockG,
            players: {
                '0': { ...mockG.players['0'], settlements: [], roads: [] }
            }
        };
        const setupCtx = { ...mockCtx, phase: PHASES.SETUP, activePlayers: null }; // Remove activePlayers stage dependency
        const setupProps = { ...props, G: setupG, ctx: setupCtx, uiMode: 'placing' as UiMode };

        render(<GameControls {...setupProps} />);

        // Find the instruction text container
        const statusContainer = screen.getByRole('status');

        // Check for attributes and content on the container
        expect(statusContainer).toHaveAttribute('aria-live', 'polite');
        expect(statusContainer).toHaveTextContent('Place a Settlement');
    });

    test('Build buttons have aria-pressed attribute', () => {
        const { rerender } = render(<GameControls {...props} />);

        // Get the Road button
        const roadButton = screen.getByLabelText(/Build Road/i);

        // Check for aria-pressed attribute - should be false initially (null buildMode)
        expect(roadButton).toHaveAttribute('aria-pressed', 'false');

        // Now re-render with buildMode='road'
        rerender(<GameControls {...props} buildMode="road" />);

        // Should be true now
        expect(screen.getByLabelText(/Build Road/i)).toHaveAttribute('aria-pressed', 'true');
    });
});
