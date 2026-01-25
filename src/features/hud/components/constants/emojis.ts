export const NO_YIELD_EMOJIS = [
    '🏜️', '💨', '🕸️', '🦗', '🥀', '🌵', // Nature/Empty
    '😒', '🫠', '🙃', '😤', '🤦‍♂️', '🤷‍♀️', // Reactions
    '🥔', '🪨', '🕳️', '🦴' // Objects (Removed duplicate 🥀)
];

export const WIN_EMOJIS = [
    '🏆', '👑', '🎉', '🚀', '🤩', '🥂', '💪', '🎩', '🦸‍♂️', '🌟'
];

export const LOSE_EMOJIS = [
    '💀', '💔', '😭', '🥀', '🏳️', '🤕', '📉', '🌧️', '💩', '🧛'
];

/**
 * Returns a random emoji from the provided list.
 */
export const getRandomEmoji = (emojis: string[]): string => {
    return emojis[Math.floor(Math.random() * emojis.length)];
};
