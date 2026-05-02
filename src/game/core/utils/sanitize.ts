import DOMPurify from 'isomorphic-dompurify';

/**
 * Removes HTML tags from a string using isomorphic-dompurify.
 * Works in both browser and Node.js environments.
 * @param str The string to sanitize.
 * @param maxLength Optional maximum length of the string (default 1000). Truncates input to prevent ReDoS/DoS.
 * @returns The sanitized string.
 */
export const stripHtml = (str: string, maxLength: number = 1000): string => {
    if (!str || typeof str !== 'string') return '';

    // Truncate input to prevent regex-based DoS attacks on extremely large strings
    let text = str;
    if (text.length > maxLength) {
        text = text.substring(0, maxLength);
    }

    // Use DOMPurify to strip all HTML tags by allowing none
    // By returning a DOM node and extracting textContent, we avoid HTML entity encoding issues.
    const node = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
        RETURN_DOM: true,
    });

    // DOMPurify returns a DocumentFragment or HTMLElement when RETURN_DOM is true
    text = node.textContent || '';

    // Clean up excessive whitespace created by text extraction
    return text.replace(/\s+/g, " ").trim();
};
