/**
 * Removes HTML tags from a string using a regex-based approach.
 * Works in both browser and Node.js environments.
 * @param str The string to sanitize.
 * @returns The sanitized string.
 */
export const stripHtml = (str: string): string => {
    if (!str || typeof str !== 'string') return '';

    // Remove script and style tags and their content first to prevent XSS/injection
    // 1. Remove script tags and content
    let text = str.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
    // 2. Remove style tags and content
    text = text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");

    // 3. Remove all other HTML tags
    text = text.replace(/<[^>]+>/g, "");

    return text.trim();
};
