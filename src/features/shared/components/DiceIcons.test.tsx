/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { DiceIcons } from './DiceIcons';

jest.mock('lucide-react', () => ({
    Dice1: (props: any) => <svg data-testid="icon-dice-1" {...props} />,
    Dice2: (props: any) => <svg data-testid="icon-dice-2" {...props} />,
    Dice3: (props: any) => <svg data-testid="icon-dice-3" {...props} />,
    Dice4: (props: any) => <svg data-testid="icon-dice-4" {...props} />,
    Dice5: (props: any) => <svg data-testid="icon-dice-5" {...props} />,
    Dice6: (props: any) => <svg data-testid="icon-dice-6" {...props} />,
    Dices: (props: any) => <svg data-testid="icon-dices" {...props} />,
}));

describe('DiceIcons', () => {
    it('renders correct dice icons based on props', () => {
        render(<DiceIcons d1={3} d2={5} />);

        expect(screen.getByTestId('icon-dice-3')).toBeInTheDocument();
        expect(screen.getByTestId('icon-dice-5')).toBeInTheDocument();
    });

    it('has correct default aria-label', () => {
        render(<DiceIcons d1={2} d2={4} />);

        const container = screen.getByRole('img');
        expect(container).toHaveAttribute('aria-label', 'Dice roll: 2 and 4');
    });

    it('accepts custom aria-label', () => {
        render(<DiceIcons d1={1} d2={1} ariaLabel="Snake eyes" />);

        const container = screen.getByRole('img');
        expect(container).toHaveAttribute('aria-label', 'Snake eyes');
    });

    it('hides icons from screen readers', () => {
        render(<DiceIcons d1={6} d2={6} />);

        const icons = screen.getAllByTestId('icon-dice-6');

        icons.forEach(icon => {
             expect(icon).toHaveAttribute('aria-hidden', 'true');
        });
    });
});
