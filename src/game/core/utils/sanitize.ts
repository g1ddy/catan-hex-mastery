/**
 * Removes HTML tags from a string using a DOM-based approach, with a fallback for Node.js.
 * @param str The string to sanitize.
 * @returns The sanitized string.
 */
export const stripHtml = (str: string): string => {
    if (typeof document !== 'undefined') {
        const el = document.createElement('div');
        el.innerHTML = str;
        // Also remove script and style tags and their content to prevent JS execution if the string is used in an unsafe context.
        el.querySelectorAll('script, style').forEach(tag => tag.remove());
        return el.textContent || '';
    }

    // Fallback for non-DOM environments (e.g. Node.js)
    // 1. Remove script and style tags and their content
    let sanitized = str.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                       .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
    // 2. Remove all other HTML tags
    sanitized = sanitized.replace(/<[^>]+>/gm, '');

    return sanitized;
};
