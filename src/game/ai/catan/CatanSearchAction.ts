import type { BotMove } from '../../core/types';

/**
 * Catan commands that are currently executable by the framework-neutral search seam.
 *
 * `buyDevCard` remains in `BotMove` for forward compatibility, but the underlying
 * game move is not implemented yet, so it must not enter search until a real
 * Catan-owned handler exists.
 */
export type CatanSearchAction = Exclude<BotMove, { move: 'buyDevCard' }>;
