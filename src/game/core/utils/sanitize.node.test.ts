/**
 * @jest-environment node
 */
import { stripHtml } from './sanitize';

describe('stripHtml (Node Environment)', () => {
    it('should remove HTML tags from a string', () => {
        const input = '<p>Hello, <strong>World!</strong></p>';
        const expected = 'Hello, World!';
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

    // New tests for CodeQL findings
    it('should remove script tags with spaces in closing tag', () => {
        const input = '<script>alert("XSS")</script >Safe';
        const expected = 'Safe';
        expect(stripHtml(input)).toEqual(expected);
    });

    it('should remove style tags with spaces in closing tag', () => {
        const input = '<style>body { color: red; }</style >Safe';
        const expected = 'Safe';
        expect(stripHtml(input)).toEqual(expected);
    });
});
