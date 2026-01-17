/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { CoachPanel } from './CoachPanel';
import { createMockGameState } from '../game/testUtils';
import { Ctx } from 'boardgame.io';
import * as analyst from '../game/analysis/analyst';
import '@testing-library/jest-dom';

// Mock the analyst module
jest.mock('../game/analysis/analyst');

describe('CoachPanel', () => {
    const mockCalculatePlayerPotentialPips = analyst.calculatePlayerPotentialPips as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('displays player names in P{ID}: {Name} format in Production Potential section', () => {
        // Setup State with custom names
        const G = createMockGameState({
            players: {
                '0': { id: '0', name: 'Player One', color: 'red' },
                '1': { id: '1', name: 'Catan Bot', color: 'blue' }
            }
        });

        // Mock potentials to ensure the section renders
        mockCalculatePlayerPotentialPips.mockReturnValue({
            '0': { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            '1': { wood: 0, brick: 1, sheep: 0, wheat: 0, ore: 0 }
        });

        const ctx = { currentPlayer: '0' } as Ctx;

        render(
            <CoachPanel
                G={G}
                ctx={ctx}
                showResourceHeatmap={false}
                setShowResourceHeatmap={jest.fn()}
                isCoachModeEnabled={true}
                setIsCoachModeEnabled={jest.fn()}
                advice={null}
            />
        );

        // Expectation: P1: Player One
        expect(screen.getByText('P1: Player One')).toBeInTheDocument();
        // Expectation: P2: Catan Bot
        expect(screen.getByText('P2: Catan Bot')).toBeInTheDocument();
    });
});
