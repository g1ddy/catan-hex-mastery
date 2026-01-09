import { BotCoach } from './BotCoach';
import { Coach } from '../game/analysis/coach';
import { GameState } from '../game/types';

describe('BotCoach', () => {
    let mockG: GameState;
    let coach: Coach;
    let botCoach: BotCoach;

    beforeEach(() => {
        mockG = {
            board: {
                hexes: {},
                vertices: {},
                edges: {}
            },
            players: {
                '0': {
                    resources: { brick: 0, wood: 0, sheep: 0, wheat: 0, ore: 0 },
                    settlements: [],
                    roads: []
                }
            }
        } as unknown as GameState;
        coach = new Coach(mockG);
        botCoach = new BotCoach(mockG, coach);
    });

    describe('getAvailableMoves', () => {
        it('should return endTurn move by default', () => {
            const moves = botCoach.getAvailableMoves('0');
            expect(moves).toContainEqual({ move: 'endTurn', args: [] });
        });

        // Add more tests for enumeration logic here
        // e.g. mock resources and verify build moves appear
    });
});
