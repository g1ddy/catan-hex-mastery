/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderCostTooltip, renderDiceTooltip, renderTradeTooltip } from './TooltipRenderers';

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    ArrowRight: (props: any) => <span data-testid="icon-arrow-right" {...props} />,
    Trees: (props: any) => <span data-testid="icon-trees" {...props} />,
    BrickWall: (props: any) => <span data-testid="icon-brick-wall" {...props} />,
    Cloud: (props: any) => <span data-testid="icon-cloud" {...props} />,
    Wheat: (props: any) => <span data-testid="icon-wheat" {...props} />,
    Mountain: (props: any) => <span data-testid="icon-mountain" {...props} />,
}));

// Mock DiceIcons
jest.mock('../../shared/components/DiceIcons', () => ({
    DiceIcons: ({ d1, d2 }: any) => <div data-testid="dice-icons">{`d1:${d1},d2:${d2}`}</div>
}));

// Mock config constants
jest.mock('../../../game/core/config', () => ({
    BANK_TRADE_GIVE_AMOUNT: 4,
    BANK_TRADE_RECEIVE_AMOUNT: 1
}));

describe('TooltipRenderers', () => {
    describe('renderCostTooltip', () => {
        it('returns null for empty content', () => {
            const result = renderCostTooltip({ content: null });
            expect(result).toBeNull();
        });

        it('returns null for invalid JSON', () => {
             const result = renderCostTooltip({ content: '{invalid' });
             expect(result).toBeNull();
        });

        it('returns null for zero cost', () => {
            const content = JSON.stringify({ wood: 0, brick: 0 });
            const result = renderCostTooltip({ content });
            expect(result).toBeNull();
        });

        it('renders resources for valid cost', () => {
            const content = JSON.stringify({ wood: 1, brick: 2 });
            const result = renderCostTooltip({ content });

            expect(result).not.toBeNull();

            const { container } = render(result!);
            expect(container).toHaveTextContent('1');
            expect(container).toHaveTextContent('2');
            expect(screen.getByTestId('icon-trees')).toBeInTheDocument();
            expect(screen.getByTestId('icon-brick-wall')).toBeInTheDocument();
        });
    });

    describe('renderDiceTooltip', () => {
        it('returns null for invalid content', () => {
            expect(renderDiceTooltip({ content: null })).toBeNull();
            expect(renderDiceTooltip({ content: 'invalid' })).toBeNull();
        });

        it('renders DiceIcons for valid content', () => {
            const content = JSON.stringify({ d1: 3, d2: 4 });
            const result = renderDiceTooltip({ content });
            expect(result).not.toBeNull();
            render(result!);
            expect(screen.getByTestId('dice-icons')).toHaveTextContent('d1:3,d2:4');
        });
    });

    describe('renderTradeTooltip', () => {
         it('renders trade details for valid JSON', () => {
            const content = JSON.stringify({
                give: 'wood',
                receive: 'brick',
                giveAmount: 4,
                receiveAmount: 1
            });
            const result = renderTradeTooltip({ content });
            expect(result).not.toBeNull();
            render(result!);
            expect(screen.getByText('4')).toBeInTheDocument();
            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByTestId('icon-arrow-right')).toBeInTheDocument();
            expect(screen.getByTestId('icon-trees')).toBeInTheDocument(); // wood
            expect(screen.getByTestId('icon-brick-wall')).toBeInTheDocument(); // brick
         });

         it('renders raw content for invalid JSON or missing fields', () => {
             const content = "Simple text";
             const result = renderTradeTooltip({ content });
             expect(result).not.toBeNull();
             render(result!);
             expect(screen.getByText('Simple text')).toBeInTheDocument();
         });
    });
});
