/**
 * @jest-environment jsdom
 */
import { stripHtml } from './sanitize';

describe('stripHtml', () => {
    it('should remove HTML tags from a string', () => {
        const input = '<p>Hello, <strong>World!</strong></p>';
        const expected = 'Hello, World!';
        expect(stripHtml(input)).toEqual(expected);
    });

    it('should handle strings with no HTML', () => {
        const input = 'Just a regular string.';
        expect(stripHtml(input)).toEqual(input);
    });

    it('should handle empty strings', () => {
        const input = '';
        expect(stripHtml(input)).toEqual('');
    });

    it('should handle complex HTML', () => {
        const input = '<div><span><a href="#">Link</a></span></div>';
        const expected = 'Link';
        expect(stripHtml(input)).toEqual(expected);
    });

    it('should remove script tags and their content', () => {
        const input = '<script>alert("XSS")</script>';
        const expected = '';
        expect(stripHtml(input)).toEqual(expected);
    });

    it('should not corrupt strings with angle brackets', () => {
        const input = 'a < b';
        expect(stripHtml(input)).toEqual('a < b');
    });

    it('should not corrupt strings with a less-than sign', () => {
        const input = 'Player <3';
        expect(stripHtml(input)).toEqual('Player <3');
    });

    it('should truncate strings exceeding default max length (1000)', () => {
        const longString = 'a'.repeat(2000);
        // Default limit is 1000
        expect(stripHtml(longString).length).toBe(1000);
    });

    it('should truncate strings exceeding custom max length', () => {
        const input = '1234567890';
        expect(stripHtml(input, 5)).toBe('12345');
    });

    it('should handle truncation before tag stripping', () => {
        // If we truncate inside a tag, it might leave partial tag
        const input = '<div>Safe</div>';
        // Truncate to 4: "<div"
        // stripHtml regex requires ">", so "<div" is treated as text
        expect(stripHtml(input, 4)).toBe('<div');
    });
});
