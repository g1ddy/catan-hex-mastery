/** @jest-environment jsdom */
import { getPrimaryHexOwner, renderTooltipContent } from './helpers';
import { GameState, BoardState } from '../../../game/core/types';
import { CoachData } from '../../coach/hooks/useCoachData';
import { CoachRecommendation } from '../../../game/analysis/types';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock Lucide icons to avoid rendering issues
jest.mock('lucide-react', () => ({
    BarChart: () => <div data-testid="bar-chart-icon" />,
    Gem: () => <div data-testid="gem-icon" />,
    Layers: () => <div data-testid="layers-icon" />,
    Zap: () => <div data-testid="zap-icon" />,
    Trees: () => <div data-testid="trees-icon" />,
    BrickWall: () => <div data-testid="brick-icon" />,
    Cloud: () => <div data-testid="cloud-icon" />,
    Wheat: () => <div data-testid="wheat-icon" />,
    Mountain: () => <div data-testid="mountain-icon" />,
    MapPin: () => <div data-testid="map-pin-icon" />,
    Home: () => <div data-testid="home-icon" />,
    Castle: () => <div data-testid="castle-icon" />
}));

describe('getPrimaryHexOwner', () => {
    // We create a partial structure and cast it to GameState.
    // To satisfy TypeScript without 'unknown', we can construct the object
    // to match the expected shape more closely or use recursive Partial if available,
    // but here we will cast the inner board object to BoardState to allow partial definition there too.
    const mockG = {
        board: {
            hexes: {
                '0,0,0': { id: '0,0,0' }, // Existing hex
                '1,-1,0': { id: '1,-1,0' } // Another existing hex
            }
        } as unknown as BoardState
    } as GameState;

    it('returns the first ID if it exists on the board', () => {
        const parts = ['0,0,0', '1,-1,0'];
        expect(getPrimaryHexOwner(parts, mockG)).toBe('0,0,0');
    });

    it('skips off-board hex IDs and returns the first existing one', () => {
        const parts = ['off-board-1', '0,0,0'];
        expect(getPrimaryHexOwner(parts, mockG)).toBe('0,0,0');
    });

    it('returns the first ID if no valid owner is found (fallback)', () => {
        const parts = ['off-board-1', 'off-board-2'];
        expect(getPrimaryHexOwner(parts, mockG)).toBe('off-board-1');
    });

    it('handles single existing ID', () => {
        const parts = ['0,0,0'];
        expect(getPrimaryHexOwner(parts, mockG)).toBe('0,0,0');
    });

    it('handles single non-existing ID', () => {
        const parts = ['off-board-1'];
        expect(getPrimaryHexOwner(parts, mockG)).toBe('off-board-1');
    });

    it('returns empty string for empty parts array', () => {
        const parts: string[] = [];
        expect(getPrimaryHexOwner(parts, mockG)).toBe('');
    });
});

describe('renderTooltipContent', () => {
    const mockRec: CoachRecommendation = {
        score: 5,
        reason: 'Test Reason',
        details: {
            pips: 3,
            scarcityBonus: true,
            scarceResources: ['brick'],
            diversityBonus: true,
            synergyBonus: false,
            neededResources: ['ore']
        }
    };

    const mockCoachData: CoachData = {
        recommendations: new Map([['test-id', mockRec]]),
        minScore: 0,
        maxScore: 10,
        top3Set: new Set()
    };

    it('returns null if content is missing', () => {
        const renderer = renderTooltipContent(mockCoachData);
        // @ts-ignore
        const result = renderer({ content: null, activeAnchor: null });
        expect(result).toBeNull();
    });

    it('returns default content div if recommendation not found', () => {
        const renderer = renderTooltipContent(mockCoachData);
        const { container } = render(renderer({ content: 'unknown-id', activeAnchor: null }) as React.ReactElement);
        expect(container).toHaveTextContent('unknown-id');
    });

    it('renders rich tooltip for valid recommendation', () => {
        const renderer = renderTooltipContent(mockCoachData);
        const { container } = render(renderer({ content: 'test-id', activeAnchor: null }) as React.ReactElement);

        expect(container).toHaveTextContent('Test Reason');
        expect(container).toHaveTextContent('Score: 5.0');
        expect(container).toHaveTextContent('3 pips'); // Regex or partial match
        expect(container).toHaveTextContent('Scarcity');
        expect(container).toHaveTextContent('Diversity');
        expect(container).toHaveTextContent('Needs:');
    });
});
