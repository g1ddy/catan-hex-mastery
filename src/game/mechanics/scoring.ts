/**
 * Returns the probability (pips) of a dice roll (2-12).
 * 2/12 = 1 pip (1/36)
 * 3/11 = 2 pips (2/36)
 * 4/10 = 3 pips (3/36)
 * 5/9  = 4 pips (4/36)
 * 6/8  = 5 pips (5/36)
 * 7    = 6 pips (6/36) - though rarely used for resource generation
 */
export const getPips = (num: number): number => {
    const map: Record<number, number> = {
        2: 1, 12: 1,
        3: 2, 11: 2,
        4: 3, 10: 3,
        5: 4, 9: 4,
        6: 5, 8: 5,
        7: 6
    };
    // eslint-disable-next-line security/detect-object-injection
    return map[num] || 0;
};
