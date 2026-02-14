/**
 * Removes HTML tags from a string using an iterative regex-based approach.
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

    // Security: Handle partial tags resulting from truncation (e.g., "<scr")
    // If the string ends with an opening tag that isn't closed, remove it.
    // This prevents bypassing regexes that look for complete tags.
    // We only remove if it looks like a tag start (i.e. < followed by alphanumeric or / or !)
    // This preserves "a < b" or "I <3 u" while removing "<scrip" or "</d"
    const lastOpenIndex = text.lastIndexOf('<');
    const lastCloseIndex = text.lastIndexOf('>');

    if (lastOpenIndex > lastCloseIndex) {
        // Check what follows the '<'
        const potentialTag = text.substring(lastOpenIndex);
        // Regex: < followed by a letter, /, or ! (for comments/doctypes)
        // If it matches, we assume it's a truncated tag and remove it.
        // If it's just "<" or "< " or "<3", we leave it.
        if (/^<[a-zA-Z!/]/.test(potentialTag)) {
            text = text.substring(0, lastOpenIndex);
        }
    }

    // Use a loop to remove nested script/style tags and handle malformed ones
    // We limit iterations to prevent infinite loops (DoS protection)
    let iterations = 0;
    const MAX_ITERATIONS = 50;

    // Regex to remove script and style blocks entirely (including content)
    // Matches <script ... > ... </script ... >
    // The [\s\S]*? is non-greedy match for content
    // We use [^>]* to match attributes, which is not perfect but generally sufficient for stripping
    // We use <\/\s*script[^>]*> to match closing tags with whitespace/attributes
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/\s*script[^>]*>/gim;
    const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/\s*style[^>]*>/gim;

    while (iterations < MAX_ITERATIONS) {
        const oldText = text;
        // Replace with a space to prevent tag reconstruction (e.g. <scr<script>ipt>)
        text = text.replace(scriptRegex, " ");
        text = text.replace(styleRegex, " ");
        if (text === oldText) break;
        iterations++;
    }

    // Now strip remaining HTML tags
    // Also loop here to handle nested tags like <<img ...>>
    iterations = 0;
    const tagRegex = /<[^>]*>/g;
    while (iterations < MAX_ITERATIONS) {
        const oldText = text;
        // Replace with a space to break adjacent tags and prevent reconstruction
        text = text.replace(tagRegex, " ");
        if (text === oldText) break;
        iterations++;
    }

    // Clean up excessive whitespace created by replacements
    return text.replace(/\s+/g, " ").trim();
};
