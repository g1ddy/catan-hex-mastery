import { GameState } from '../game/types';

/**
 * Validates that a string is a safe hex coordinate ID.
 * Format expected: "q,r,s" or "q,r,s::q,r,s" or "q,r,s::q,r,s::q,r,s"
 * Rejects any prototype pollution attempts or other malicious strings.
 */
export const isValidHexId = (id: string): boolean => {
    if (typeof id !== 'string') return false;

    // Reject suspicious keys immediately
    if (id === '__proto__' || id === 'constructor' || id === 'prototype') return false;

    // Reject extremely long strings to prevent potential DoS/ReDoS
    // Typical hex ID is small (e.g., "1,-1,0" is 6 chars).
    // A vertex (3 hexes) might be around 25 chars.
    // A max length of 64 is generous but prevents abuse.
    if (id.length > 64) return false;

    // Must match pattern: integers separated by commas, groups separated by ::
    // Example: "1,-1,0" or "1,-1,0::0,1,-1"
    const coordPattern = /^-?\d+,-?\d+,-?\d+$/;

    const parts = id.split('::');
    if (parts.length === 0 || parts.length > 3) return false;

    return parts.every(part => {
        if (!coordPattern.test(part)) {
            return false;
        }
        const [q, r, s] = part.split(',').map(Number);

        // Security: Ensure coordinates are within safe integer range to prevent precision loss/overflow attacks
        if (!Number.isSafeInteger(q) || !Number.isSafeInteger(r) || !Number.isSafeInteger(s)) {
            return false;
        }

        // For a valid cube coordinate, the sum of its components must be 0.
        return q + r + s === 0;
    });
};

/**
 * Validates that a playerID exists in the current GameState.
 * Prevents prototype pollution and access to undefined players.
 */
export const isValidPlayer = (G: GameState, playerID: string): boolean => {
    if (typeof playerID !== 'string') return false;
    // Basic safety checks against prototype pollution keys
    if (['__proto__', 'constructor', 'prototype'].includes(playerID)) return false;

    return Object.prototype.hasOwnProperty.call(G.players, playerID);
};
