import { calculateTrade } from './trade';

describe('Trade Logic', () => {
    describe('calculateTrade', () => {
        it('should identify the most abundant resource to give and least abundant to receive', () => {
            const resources = {
                wood: 5,
                brick: 0,
                sheep: 2,
                wheat: 3,
                ore: 1
            };
            const result = calculateTrade(resources);
            expect(result).toEqual({
                give: 'wood',
                receive: 'brick',
                canTrade: true
            });
        });

        it('should not allow trade if no resource has >= 4', () => {
            const resources = {
                wood: 3,
                brick: 3,
                sheep: 3,
                wheat: 3,
                ore: 3
            };
            const result = calculateTrade(resources);
            expect(result.canTrade).toBe(false);
        });

        it('should handle tie-breaking for "give" (pick first in order)', () => {
            // Order: wood, brick, sheep, wheat, ore
            const resources = {
                wood: 5,
                brick: 5, // Tie
                sheep: 0,
                wheat: 0,
                ore: 0
            };
            const result = calculateTrade(resources);
            expect(result.give).toBe('wood'); // First in list
        });

        it('should handle tie-breaking for "receive" (pick first in order)', () => {
            // Order: wood, brick, sheep, wheat, ore
            const resources = {
                wood: 5,
                brick: 2,
                sheep: 0, // Tie
                wheat: 0, // Tie
                ore: 0    // Tie
            };
            const result = calculateTrade(resources);
            expect(result.receive).toBe('sheep'); // First in list among mins
        });

        it('should handle case where max and min are the same (all equal)', () => {
            const resources = {
                wood: 4,
                brick: 4,
                sheep: 4,
                wheat: 4,
                ore: 4
            };
            const result = calculateTrade(resources);
            expect(result.give).toBe('wood');
            expect(result.receive).toBe('wood');
            expect(result.canTrade).toBe(true);
        });
    });
});
