/**
 * Removes HTML tags from a string using a DOM-based approach.
 * @param str The string to sanitize.
 * @returns The sanitized string.
 */
export const stripHtml = (str: string): string => {
    const el = document.createElement('div');
    el.innerHTML = str;
    return el.textContent || '';
};
