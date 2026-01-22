import { Move } from 'boardgame.io';
import { GameState, RollStatus } from '../core/types';
import { RuleEngine } from '../rules/validator';

export const rollDice: Move<GameState> = ({ G, ctx, random }) => {
    // Validate the move using the centralized RuleEngine
    RuleEngine.validateMoveOrThrow(G, ctx, 'rollDice', []);

    const d1 = random.Die(6);
    const d2 = random.Die(6);

    G.lastRoll = [d1, d2];
    G.rollStatus = RollStatus.ROLLING;
    G.notification = null; // Clear previous event
    // RollStatus update is handled implicitly by stage transition or onMove
};
