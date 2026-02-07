/**
 * Removes HTML tags from a string using an iterative regex-based approach.
 * Works in both browser and Node.js environments.
 * @param str The string to sanitize.
 * @returns The sanitized string.
 */
export const stripHtml = (str: string): string => {
    if (!str || typeof str !== 'string') return '';

    let text = str;

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
