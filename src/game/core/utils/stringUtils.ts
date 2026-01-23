/**
 * Capitalizes the first letter of a string.
 * @param s The string to capitalize
 * @returns The capitalized string
 */
export const capitalize = (s: string): string => {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
};
