import { getPips } from './scoring';

describe('scoring mechanics', () => {
    it('returns correct pips', () => {
        expect(getPips(2)).toBe(1);
        expect(getPips(12)).toBe(1);
        expect(getPips(3)).toBe(2);
        expect(getPips(11)).toBe(2);
        expect(getPips(6)).toBe(5);
        expect(getPips(8)).toBe(5);
        expect(getPips(7)).toBe(6);
    });

    it('returns 0 for invalid numbers', () => {
        expect(getPips(0)).toBe(0);
        expect(getPips(13)).toBe(0);
    });
});
