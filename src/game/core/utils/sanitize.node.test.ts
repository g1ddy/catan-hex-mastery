/**
 * @jest-environment node
 */
import { stripHtml } from './sanitize';

describe('stripHtml (Node Environment)', () => {
    // In node environment, document is undefined, so the fallback regex logic is used.

    it('should remove HTML tags from a string', () => {
        const input = '<p>Hello, <strong>World!</strong></p>';
        const expected = 'Hello, World!';
        // Regex replacement is simple, might leave extra spaces depending on implementation?
        // My implementation: replace tags with empty string.
        // <p>Hello, <strong>World!</strong></p> -> Hello, World!
        expect(stripHtml(input)).toEqual(expected);
    });

    it('should remove script tags and their content', () => {
        const input = '<script>alert("XSS")</script>Safe';
        const expected = 'Safe';
        expect(stripHtml(input)).toEqual(expected);
    });

    it('should remove style tags and their content', () => {
        const input = '<style>body { color: red; }</style>Safe';
        const expected = 'Safe';
        expect(stripHtml(input)).toEqual(expected);
    });

    it('should handle strings with no HTML', () => {
        const input = 'Just a regular string.';
        expect(stripHtml(input)).toEqual(input);
    });
});
