/**
 * Removes HTML tags from a string.
 * @param str The string to sanitize.
 * @returns The sanitized string.
 */
export const stripHtml = (str: string): string => {
    return str.replace(/<[^>]*>?/gm, '');
};
