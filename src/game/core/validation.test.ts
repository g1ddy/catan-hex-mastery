import { isValidHexId } from './validation';

describe('isValidHexId', () => {
  test('accepts valid hex coordinates', () => {
    expect(isValidHexId('1,-1,0')).toBe(true);
    expect(isValidHexId('0,0,0')).toBe(true);
    expect(isValidHexId('-2,1,1')).toBe(true);
  });

  test('accepts valid edge/vertex IDs', () => {
    expect(isValidHexId('1,-1,0::0,1,-1')).toBe(true);
    expect(isValidHexId('1,-1,0::0,1,-1::-1,0,1')).toBe(true);
  });

  test('rejects non-strings', () => {
    expect(isValidHexId(null as unknown as string)).toBe(false);
    expect(isValidHexId(123 as unknown as string)).toBe(false);
    expect(isValidHexId(undefined as unknown as string)).toBe(false);
  });

  test('rejects prototype keys', () => {
    expect(isValidHexId('__proto__')).toBe(false);
    expect(isValidHexId('constructor')).toBe(false);
    expect(isValidHexId('prototype')).toBe(false);
  });

  test('rejects excessively long strings', () => {
    const longString = '1,-1,0::'.repeat(10) + '1,-1,0';
    expect(isValidHexId(longString)).toBe(false);
  });

  test('rejects invalid patterns', () => {
    expect(isValidHexId('invalid')).toBe(false);
    expect(isValidHexId('1,2,3')).toBe(false); // Sum != 0
    expect(isValidHexId('1,a,0')).toBe(false);
    expect(isValidHexId('')).toBe(false);
    expect(isValidHexId('::')).toBe(false);
  });

  test('rejects unsafe integers (precision loss)', () => {
    // 2^53 + 1 = 9007199254740993 (unsafe)
    // In JS number, this becomes 9007199254740992
    // 9007199254740992 - 9007199254740992 + 0 === 0, so math check passes
    // But isSafeInteger check should fail
    const unsafe = "9007199254740993,-9007199254740993,0";
    expect(isValidHexId(unsafe)).toBe(false);
  });

  test('rejects more unsafe integers', () => {
      // 2^53 is unsafe. Sum is 2^53 - (2^53 - 1) - 1 = 0.
      const unsafeAtBoundary = '9007199254740992,-9007199254740991,-1';
      expect(isValidHexId(unsafeAtBoundary)).toBe(false);

      // Unsafe negative number
      const unsafeMin = '-9007199254740992,9007199254740991,1';
      expect(isValidHexId(unsafeMin)).toBe(false);
  });

  test('rejects out of bounds coordinates', () => {
    // 100 is > MAX_COORDINATE_VALUE (20)
    expect(isValidHexId('100,-100,0')).toBe(false);
    expect(isValidHexId('20,-20,0')).toBe(true); // Boundary check
    expect(isValidHexId('-21,20,1')).toBe(false); // One component over
  });
});
