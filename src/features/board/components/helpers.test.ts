import { getPrimaryHexOwner } from './helpers';
import { GameState } from '../../../game/core/types';

describe('getPrimaryHexOwner', () => {
    // Mock GameState with just enough structure for the test
    const mockG = {
        board: {
            hexes: {
                '0,0,0': { id: '0,0,0' }, // Existing hex
                '1,-1,0': { id: '1,-1,0' } // Another existing hex
            }
        }
    } as unknown as GameState;

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
});
