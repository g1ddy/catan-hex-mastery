
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { GameControls, BuildMode, UiMode } from './GameControls';
import { GameState } from '../game/types';
import { PHASES, STAGES } from '../game/constants';
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
    Handshake: () => <div data-testid="icon-handshake" />,
}));

// Mock react-tooltip
jest.mock('react-tooltip', () => ({
    Tooltip: () => null,
}));

// Mock safeMove
jest.mock('../utils/moveUtils', () => ({
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
        setupPhase: { activeRound: 1, activeSettlement: null },
        setupOrder: ['0'],
        lastRoll: [0, 0],
        lastRollRewards: {},
        boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
        rollStatus: 'IDLE',
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
        tradeBank: jest.fn(),
    };

    const props = {
        G: mockG,
        ctx: mockCtx,
        moves: mockMoves,
        buildMode: null as BuildMode,
        setBuildMode: jest.fn(),
        uiMode: 'viewing' as UiMode,
        setUiMode: jest.fn(),
    };

    test('Setup Placing Mode shows Cancel button', () => {
        const setupCtx = { ...mockCtx, phase: PHASES.SETUP, activePlayers: { '0': STAGES.PLACE_SETTLEMENT } };
        const setupProps = { ...props, ctx: setupCtx, uiMode: 'placing' as UiMode };

        render(<GameControls {...setupProps} />);

        const cancelButton = screen.getByText('Cancel Placement');
        expect(cancelButton).toBeInTheDocument();
        expect(cancelButton.closest('button')).toBeEnabled();
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
