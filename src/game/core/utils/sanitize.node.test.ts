/**
 * @jest-environment node
 */
import { stripHtml } from './sanitize';

describe('stripHtml (Node Environment)', () => {
    // ... existing tests ...

    // Reproduction of tag reconstruction
    it('should prevent tag reconstruction via nested inputs', () => {
        // Input designed to reconstruct <script> after one pass of stripping
        const input = '<<script>script>alert(1)</script>';
        // 1. Script stripper looks for <script... /script>.
        //    It finds <script>alert(1)</script>.
        //    Replaces with "".
        //    Result: "<script>" (The outer layer).
        // 2. Generic stripper looks for <...>.
        //    It finds <script>.
        //    Replaces with "".
        //    Result: "".
        //    Wait, my logic above says it works.

        // Let's try one where the generic stripper is the one being fooled.
        // <scr<script>ipt>
        // Script stripper: No match (no valid script tag pair).
        // Generic stripper: Matches <script>. Removes it.
        // Result: <script>

        const input2 = '<scr<script>ipt>alert(1)</script>';
        const expected = 'alert(1)'; // The content might remain, but the TAG should be gone.
        // If result contains "<script>", it fails security check.

        const result = stripHtml(input2);
        expect(result).not.toContain('<script');
        expect(result).not.toContain('</script');

        // This is the specific case CodeQL hates:
        // "This string may still contain [<script]"
    });
});
