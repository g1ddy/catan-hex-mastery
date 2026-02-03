import { getPrimaryHexOwner } from './helpers';
import { GameState, BoardState } from '../../../game/core/types';

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
