export interface SearchRandom {
  next(): number;                 // [0, 1)
  integer(maxExclusive: number): number;
  pick<T>(values: readonly T[]): T;
  die(sides: number): number;     // 1..sides
}

function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash >>> 0;
}

export class SeededSearchRandom implements SearchRandom {
  private rng: () => number;

  constructor(seed: string | number = 0) {
    const numericSeed = typeof seed === 'number' ? seed >>> 0 : stringToSeed(seed);
    this.rng = mulberry32(numericSeed);
  }

  next(): number {
    return this.rng();
  }

  integer(maxExclusive: number): number {
    if (maxExclusive <= 0 || !Number.isInteger(maxExclusive)) {
      throw new Error(`integer maxExclusive must be a positive integer, got: ${maxExclusive}`);
    }
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    const idx = this.integer(values.length);
    return values[idx];
  }

  die(sides: number): number {
    if (sides <= 0 || !Number.isInteger(sides)) {
      throw new Error(`die sides must be a positive integer, got: ${sides}`);
    }
    return this.integer(sides) + 1;
  }
}
