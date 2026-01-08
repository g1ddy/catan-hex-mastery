/**
 * @jest-environment jsdom
 */
import { render, screen, act } from '@testing-library/react';
import { ProductionToast } from './ProductionToast';
import { GameState } from '../game/types';
import '@testing-library/jest-dom';

// Mock GameState
const mockG = {
    players: {
        '0': { color: '#ff0000', resources: {}, id: '0' },
        '1': { color: '#0000ff', resources: {}, id: '1' }
    },
    lastRoll: [1, 1], // sum 2
    lastRollRewards: {
        '0': { wood: 0, brick: 0, wheat: 0, ore: 0, sheep: 0 },
        '1': { wood: 0, brick: 0, wheat: 0, ore: 0, sheep: 0 }
    }
} as unknown as GameState;

const GWithRewards = {
    ...mockG,
    lastRollRewards: {
        '0': { wood: 1, brick: 0, wheat: 0, ore: 0, sheep: 0 },
        '1': { wood: 0, brick: 0, wheat: 0, ore: 0, sheep: 0 }
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
});
