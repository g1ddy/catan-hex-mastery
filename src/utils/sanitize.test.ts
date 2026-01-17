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

    it('should handle script tags', () => {
        const input = '<script>alert("XSS")</script>';
        const expected = 'alert("XSS")';
        expect(stripHtml(input)).toEqual(expected);
    });
});
