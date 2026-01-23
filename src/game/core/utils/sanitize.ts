/**
 * Removes HTML tags from a string using a DOM-based approach.
 * @param str The string to sanitize.
 * @returns The sanitized string.
 */
export const stripHtml = (str: string): string => {
    const el = document.createElement('div');
    el.innerHTML = str;
    // Also remove script and style tags and their content to prevent JS execution if the string is used in an unsafe context.
    el.querySelectorAll('script, style').forEach(tag => tag.remove());
    return el.textContent || '';
};
