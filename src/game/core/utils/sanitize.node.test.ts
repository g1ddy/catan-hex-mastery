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

    it('should remove script tags with spaces in closing tag', () => {
        const input = '<script>alert("XSS")</script >Safe';
        const expected = 'Safe';
        expect(stripHtml(input)).toEqual(expected);
    });

    it('should remove script tags with malformed closing tag', () => {
        const input = '<script>alert("XSS")</script\t\n bar>Safe';
        const expected = 'Safe';
        expect(stripHtml(input)).toEqual(expected);
    });

    it('should prevent tag reconstruction via nested inputs', () => {
        // Attack: Nested tags designed to reconstruct <script> after one pass of stripping
        const input = '<scr<script>ipt>alert(1)</script>';

        const result = stripHtml(input);

        // We expect the script tag to be gone. The content might remain depending on the stripper logic,
        // but the DANGEROUS tag must be gone.
        expect(result).not.toContain('<script');
        expect(result).not.toContain('</script');
    });
});
