/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { GameNotification } from './GameNotification';
import { GameState, RollStatus } from '../../../game/core/types';
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
jest.mock('../../shared/components/DiceIcons', () => ({
    DiceIcons: () => <div data-testid="icon-dice-icons" />
}));

// Mock GameState
const mockG = {
    players: {
        '0': { color: '#ff0000', resources: {}, id: '0', name: 'Player 0' },
        '1': { color: '#0000ff', resources: {}, id: '1', name: 'Player 1' }
    },
    lastRoll: [1, 1], // sum 2
    notification: null,
    rollStatus: RollStatus.IDLE
} as unknown as GameState;

const GRolling = {
    ...mockG,
    rollStatus: RollStatus.ROLLING,
    notification: null
} as unknown as GameState;

const GWithRewards = {
    ...mockG,
    rollStatus: RollStatus.RESOLVED,
    notification: {
        type: 'production',
        rollValue: 2,
        rewards: {
            '0': { wood: 1, brick: 0, wheat: 0, ore: 0, sheep: 0 },
            '1': { wood: 0, brick: 0, wheat: 0, ore: 0, sheep: 0 }
        }
    }
} as unknown as GameState;

const GNoRewards = {
    ...mockG,
    rollStatus: RollStatus.RESOLVED,
    notification: {
        type: 'production',
        rollValue: 2,
        rewards: {
            '0': { wood: 0 },
            '1': { wood: 0 }
        }
    }
} as unknown as GameState;

const GWithSteal = {
    ...mockG,
    rollStatus: RollStatus.RESOLVED,
    notification: {
        type: 'robber',
        thief: '0',
        victim: '1',
        resource: 'wood'
    }
} as unknown as GameState;

jest.useFakeTimers();

describe('GameNotification', () => {
    test('renders Rolling state', () => {
        render(<GameNotification G={GRolling} />);
        expect(screen.getByText('Rolling...')).toBeInTheDocument();
        expect(screen.queryByText('P1')).not.toBeInTheDocument();
    });

    test('renders resources immediately when notification present', () => {
        render(<GameNotification G={GWithRewards} />);

        // Should NOT show rolling
        expect(screen.queryByText('Rolling...')).not.toBeInTheDocument();

        // Should show result immediately
        expect(screen.getByText('P1')).toBeInTheDocument();
        expect(screen.getByTestId('icon-trees')).toBeInTheDocument();
    });

    test('renders emoji when no rewards', () => {
        render(<GameNotification G={GNoRewards} />);
        expect(screen.getByLabelText('No resources')).toBeInTheDocument();
    });

    test('renders robber variant correctly', () => {
        render(<GameNotification G={GWithSteal} />);

        // Should show Ghost icon immediately (no animation delay logic for robber)
        expect(screen.getByTestId('icon-ghost')).toBeInTheDocument();

        // Should show Thief and Victim names
        expect(screen.getByText('Player 0')).toBeInTheDocument();
        expect(screen.getByText('Player 1')).toBeInTheDocument();

        // Should show Resource icon
        expect(screen.getByTestId('icon-trees')).toBeInTheDocument(); // Wood -> Trees icon
    });
});
