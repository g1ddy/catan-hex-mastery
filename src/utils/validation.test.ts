import { isValidHexId } from './validation';

describe('isValidHexId', () => {
    test('should return true for valid hex IDs', () => {
        expect(isValidHexId('0,0,0')).toBe(true);
        expect(isValidHexId('1,-1,0')).toBe(true);
        expect(isValidHexId('0,0,0::1,-1,0')).toBe(true); // Edge ID (2 hexes)
        expect(isValidHexId('0,0,0::1,-1,0::0,1,-1')).toBe(true); // Vertex ID (3 hexes)
    });

    test('should return false for invalid formats', () => {
        expect(isValidHexId('invalid')).toBe(false);
        expect(isValidHexId('0,0')).toBe(false); // Missing coord
        expect(isValidHexId('0,0,0,0')).toBe(false); // Too many coords
        expect(isValidHexId('0,0,0::')).toBe(false); // Trailing separator
        expect(isValidHexId('::0,0,0')).toBe(false); // Leading separator
    });

    test('should return false for non-string inputs', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(isValidHexId(123 as any)).toBe(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(isValidHexId(null as any)).toBe(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(isValidHexId({} as any)).toBe(false);
    });

    test('should block prototype pollution attempts', () => {
        expect(isValidHexId('__proto__')).toBe(false);
        expect(isValidHexId('constructor')).toBe(false);
        expect(isValidHexId('prototype')).toBe(false);
        expect(isValidHexId('0,0,0::__proto__')).toBe(false);
    });

    test('should block excessively long strings', () => {
        const longId = '0,0,0::'.repeat(20) + '0,0,0';
        expect(isValidHexId(longId)).toBe(false);
    });
});
