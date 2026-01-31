/**
 * Removes HTML tags from a string using a DOM-based approach, with a fallback for Node.js.
 * @param str The string to sanitize.
 * @returns The sanitized string.
 */
export const stripHtml = (str: string): string => {
    if (typeof document !== 'undefined') {
        const el = document.createElement('div');
        el.innerHTML = str;
        // Also remove script and style tags and their content to prevent JS execution if the string is used in an unsafe context.
        el.querySelectorAll('script, style').forEach(tag => tag.remove());
        return el.textContent || '';
    }

    // Fallback for non-DOM environments (e.g. Node.js)
    let sanitized = str;
    let previous = "";

    // Loop to handle nested tags (e.g. <<script>script>) and prevent reconstruction attacks.
    // We limit iterations to prevent potential DoS (infinite loops).
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (sanitized !== previous && iterations < MAX_ITERATIONS) {
        previous = sanitized;

        // 1. Remove script and style tags and their content
        // <\/\s*script[^>]*> matches </script>, </script >, etc.
        sanitized = sanitized.replace(/<script\b[^>]*>([\s\S]*?)<\/\s*script[^>]*>/gim, "")
                           .replace(/<style\b[^>]*>([\s\S]*?)<\/\s*style[^>]*>/gim, "");

        // 2. Remove all other HTML tags
        sanitized = sanitized.replace(/<[^>]+>/gm, '');

        iterations++;
    }

    return sanitized;
};
