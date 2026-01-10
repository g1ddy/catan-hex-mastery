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
    // @ts-ignore
    expect(isValidHexId(null)).toBe(false);
    // @ts-ignore
    expect(isValidHexId(123)).toBe(false);
    // @ts-ignore
    expect(isValidHexId(undefined)).toBe(false);
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
});
