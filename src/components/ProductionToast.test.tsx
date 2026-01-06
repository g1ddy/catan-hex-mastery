import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProductionToast } from './ProductionToast';
import { GameState } from '../game/types';

const mockG: GameState = {
    players: {
        '0': { color: 'red' },
        '1': { color: 'blue' }
    },
    lastRollRewards: {},
    lastRoll: [1, 1], // Sum 2
} as unknown as GameState;

describe('ProductionToast', () => {
    test('renders roll number', () => {
        render(<ProductionToast G={mockG} sum={2} visible={true} />);
        expect(screen.getByText('Roll: 2')).toBeInTheDocument();
    });

    test('renders resources when present', () => {
        const GWithRewards = {
            ...mockG,
            lastRollRewards: {
                '0': { wood: 1 }
            }
        } as unknown as GameState;

        render(<ProductionToast G={GWithRewards} sum={4} visible={true} />);
        expect(screen.getByText(/P1/)).toBeInTheDocument(); // Player 1 (index 0)
        expect(screen.getByText(/\+1/)).toBeInTheDocument();
    });

    test('renders emoji when no rewards', () => {
        render(<ProductionToast G={mockG} sum={2} visible={true} />);

        // We expect an emoji. Since it's random, we can look for the role="img" container or ensure the text is not empty.
        const emojiContainer = screen.getByRole('img', { name: /No resources/i });
        expect(emojiContainer).toBeInTheDocument();
        expect(emojiContainer.textContent).toBeTruthy();
    });
});
