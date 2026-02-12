/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { BuildBar } from './BuildBar';
import { TradeResult } from '../../../../game/mechanics/trade';
import '@testing-library/jest-dom';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Handshake: () => <div data-testid="icon-handshake" />,
    MapPin: () => <div data-testid="icon-map-pin" />,
    Home: () => <div data-testid="icon-home" />,
    Castle: () => <div data-testid="icon-castle" />,
}));

// Mock react-tooltip
jest.mock('react-tooltip', () => ({
    Tooltip: () => null,
}));

describe('BuildBar Accessibility', () => {
    const mockProps = {
        affordMap: { road: false, settlement: false, city: false },
        isMoveAllowed: jest.fn(() => false), // Nothing allowed initially
        buildMode: null,
        setBuildMode: jest.fn(),
        canTrade: false,
        tradeResult: { give: null, receive: null, giveAmount: 0 } as TradeResult,
        onTrade: jest.fn(),
        isCoachModeEnabled: false,
        advice: null,
    };

    test('Disabled Build Buttons are focusable and have aria-disabled', () => {
        render(<BuildBar {...mockProps} />);

        // Select by aria-label prefix (Road)
        // Note: The actual label includes cost, e.g., "Build Road (Cost: 1 Wood, 1 Brick)"
        const roadButton = screen.getByLabelText(/Build Road/i);

        // Should NOT have disabled attribute
        expect(roadButton).not.toBeDisabled();

        // Should have aria-disabled="true"
        expect(roadButton).toHaveAttribute('aria-disabled', 'true');

        // Should be focusable
        roadButton.focus();
        expect(document.activeElement).toBe(roadButton);
    });

    test('Clicking disabled Build Button does not trigger action', () => {
        render(<BuildBar {...mockProps} />);

        const roadButton = screen.getByLabelText(/Build Road/i);
        fireEvent.click(roadButton);

        expect(mockProps.setBuildMode).not.toHaveBeenCalled();
    });

    test('Disabled Trade Button is focusable and has aria-disabled', () => {
        render(<BuildBar {...mockProps} />);

        const tradeButton = screen.getByLabelText('Trade 4:1');

        expect(tradeButton).not.toBeDisabled();
        expect(tradeButton).toHaveAttribute('aria-disabled', 'true');

        tradeButton.focus();
        expect(document.activeElement).toBe(tradeButton);
    });

    test('Clicking disabled Trade Button does not trigger action', () => {
        render(<BuildBar {...mockProps} />);

        const tradeButton = screen.getByLabelText('Trade 4:1');
        fireEvent.click(tradeButton);

        expect(mockProps.onTrade).not.toHaveBeenCalled();
    });

    test('Enabled buttons work normally', () => {
        const enabledProps = {
            ...mockProps,
            affordMap: { road: true, settlement: false, city: false },
            isMoveAllowed: jest.fn((move) => move === 'buildRoad'),
        };

        render(<BuildBar {...enabledProps} />);

        const roadButton = screen.getByLabelText(/Build Road/i);

        expect(roadButton).toHaveAttribute('aria-disabled', 'false');

        fireEvent.click(roadButton);
        expect(enabledProps.setBuildMode).toHaveBeenCalledWith('road');
    });
});
