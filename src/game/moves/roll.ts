import { Move } from 'boardgame.io';
import { GameState, RollStatus } from '../types';

export const rollDice: Move<GameState> = ({ G, random }) => {
    // Basic validation is implicit via stage configuration, but can prevent double rolling if needed.
    // However, since we transition stages immediately after via onMove, this check is less critical
    // but good for safety if we stick to one roll per turn.
    // const canRoll = ... (omitted as stage usually restricts this)

    const d1 = random.Die(6);
    const d2 = random.Die(6);

    G.lastRoll = [d1, d2];
    G.rollStatus = RollStatus.ROLLING;
    G.lastRollRewards = {}; // Clear previous rewards
    G.lastSteal = null; // Clear previous steal event
    // RollStatus update is handled implicitly by stage transition or onMove
};
