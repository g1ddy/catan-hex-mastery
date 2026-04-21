import DOMPurify from 'isomorphic-dompurify';

/**
 * Removes HTML tags from a string using isomorphic-dompurify.
 * Works securely in both browser and Node.js environments.
 * @param str The string to sanitize.
 * @param maxLength Optional maximum length of the string (default 1000). Truncates input to prevent ReDoS/DoS.
 * @returns The sanitized string.
 */
export const stripHtml = (str: string, maxLength: number = 1000): string => {
    if (!str || typeof str !== 'string') return '';

    // Truncate input to prevent DoS attacks on extremely large strings
    let text = str;
    if (text.length > maxLength) {
        text = text.substring(0, maxLength);
    }

    // Security: Use DOMPurify to securely strip all tags while maintaining text content.
    // We allow 0 tags, effectively stripping everything.
    text = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [], // Strip all HTML tags
        KEEP_CONTENT: true, // Keep the text content of tags, except script/style (which are removed by default)
    });

    // Clean up excessive whitespace
    let result = text.replace(/\s+/g, ' ').trim();

    // Ensure final string respects maxLength (DOMPurify encoding can expand length)
    if (result.length > maxLength) {
        result = result.substring(0, maxLength);
    }

    return result;
};
