/**
 * @jest-environment jsdom
 */
import { render, screen, act } from '@testing-library/react';
import { ProductionToast } from './ProductionToast';
import { GameState } from '../game/types';
import '@testing-library/jest-dom';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Loader2: () => <div data-testid="icon-loader" />,
    Trees: () => <div data-testid="icon-trees" />,
    BrickWall: () => <div data-testid="icon-brick" />,
    Wheat: () => <div data-testid="icon-wheat" />,
    Mountain: () => <div data-testid="icon-mountain" />,
    Cloud: () => <div data-testid="icon-cloud" />,
    Dices: () => <div data-testid="icon-dices" />,
    Ghost: () => <div data-testid="icon-ghost" />,
    ArrowRight: () => <div data-testid="icon-arrow-right" />,
}));

// Mock DiceIcons
jest.mock('./DiceIcons', () => ({
    DiceIcons: () => <div data-testid="icon-dice-icons" />
}));

// Mock GameState
const mockG = {
    players: {
        '0': { color: '#ff0000', resources: {}, id: '0', name: 'Player 0' },
        '1': { color: '#0000ff', resources: {}, id: '1', name: 'Player 1' }
    },
    lastRoll: [1, 1], // sum 2
    lastRollRewards: {
        '0': { wood: 0, brick: 0, wheat: 0, ore: 0, sheep: 0 },
        '1': { wood: 0, brick: 0, wheat: 0, ore: 0, sheep: 0 }
    },
    lastSteal: null
} as unknown as GameState;

const GWithRewards = {
    ...mockG,
    lastRollRewards: {
        '0': { wood: 1, brick: 0, wheat: 0, ore: 0, sheep: 0 },
        '1': { wood: 0, brick: 0, wheat: 0, ore: 0, sheep: 0 }
    }
} as unknown as GameState;

const GWithSteal = {
    ...mockG,
    lastSteal: {
        thief: '0',
        victim: '1',
        resource: 'wood'
    }
} as unknown as GameState;

jest.useFakeTimers();

describe('ProductionToast', () => {
    test('renders resources when present after animation', () => {
        render(<ProductionToast G={GWithRewards} visible={true} />);

        act(() => {
            jest.advanceTimersByTime(1000);
        });

        expect(screen.getByText('P1')).toBeInTheDocument();
        // Check for "1" (amount) or finding by icon logic could be complex,
        // but verifying the player label is sufficient to know the block rendered.
    });

    test('renders emoji when no rewards', () => {
        render(<ProductionToast G={mockG} visible={true} />);

        act(() => {
            jest.advanceTimersByTime(1000);
        });

        expect(screen.getByLabelText('No resources')).toBeInTheDocument();
    });

    test('renders robber variant correctly', () => {
        render(<ProductionToast G={GWithSteal} visible={true} variant="robber" />);

        // Should show Ghost icon immediately (no animation delay logic for robber)
        expect(screen.getByTestId('icon-ghost')).toBeInTheDocument();

        // Should show Thief and Victim names
        expect(screen.getByText('Player 0')).toBeInTheDocument();
        expect(screen.getByText('Player 1')).toBeInTheDocument();

        // Should show Resource icon
        expect(screen.getByTestId('icon-trees')).toBeInTheDocument(); // Wood -> Trees icon
    });

    test('renders nothing for robber variant if steal data is missing', () => {
        render(<ProductionToast G={mockG} visible={true} variant="robber" />);
        // Should not render content section
        expect(screen.queryByText('Player 0')).not.toBeInTheDocument();
    });
});
