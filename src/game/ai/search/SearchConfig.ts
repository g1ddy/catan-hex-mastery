export interface SearchConfig {
  iterations: number;
  maxDepth: number;
  seed?: string | number;
  explorationConstant?: number;
}

export function validateSearchConfig(config: SearchConfig): void {
  if (!Number.isInteger(config.iterations) || config.iterations <= 0) {
    throw new Error(`Invalid search config: iterations must be a positive integer, got ${config.iterations}`);
  }

  if (!Number.isInteger(config.maxDepth) || config.maxDepth <= 0) {
    throw new Error(`Invalid search config: maxDepth must be a positive integer, got ${config.maxDepth}`);
  }

  if (
    config.explorationConstant !== undefined &&
    (typeof config.explorationConstant !== 'number' ||
      Number.isNaN(config.explorationConstant) ||
      config.explorationConstant < 0)
  ) {
    throw new Error(
      `Invalid search config: explorationConstant must be a non-negative number, got ${config.explorationConstant}`
    );
  }
}
