/**
 * Validates a hex ID string (e.g. "0,0,0" or "0,0,0::1,-1,0").
 *
 * Prevents:
 * - Prototype pollution attacks (checking for keys like __proto__)
 * - ReDOS (by using strict length limits and simple regex)
 * - Injection of arbitrary data
 */
export const isValidHexId = (id: string): boolean => {
  if (typeof id !== 'string') return false;

  // Max length check to prevent memory exhaustion / DoS
  // A standard vertex ID (3 hexes) is roughly "q,r,s::q,r,s::q,r,s"
  // Max coord is usually small (e.g. -5 to 5).
  // "5,5,5::5,5,5::5,5,5" is length ~20.
  // Allow safe buffer but reject overly long strings.
  if (id.length > 50) return false;

  // Strict regex for comma-separated integers, optionally joined by ::
  // ^(-?\d+,-?\d+,-?\d+)(::(-?\d+,-?\d+,-?\d+))*$
  const hexPattern = /^(-?\d+,-?\d+,-?\d+)(::(-?\d+,-?\d+,-?\d+))*$/;
  return hexPattern.test(id);
};
