/**
 * Capitalizes the first letter of a string.
 * @param s The string to capitalize
 * @returns The capitalized string
 */
export const capitalize = (s: string): string => {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Formats a resource object into a human-readable string.
 * Example: { wood: 1, brick: 2 } -> "1 Wood, 2 Brick"
 * @param resources The resource counts
 * @returns The formatted string
 */
export const formatResourceList = (resources: Record<string, number>): string => {
    const parts = Object.entries(resources)
        .filter(([, amount]) => amount > 0)
        .map(([resource, amount]) => `${amount} ${capitalize(resource)}`);

    if (parts.length === 0) return 'None';
    return parts.join(', ');
};
