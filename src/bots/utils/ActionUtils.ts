import { GameAction, BotMove, MoveArguments } from '../../game/core/types';

export class ActionUtils {
    /**
     * Extracts the move name from a GameAction (BotMove or ActionShape).
     */
    public static getMoveName(action: GameAction): keyof MoveArguments | null {
        if (!action) return null;
        if (typeof action === 'object' && 'payload' in action && action.payload) {
            return action.payload.type;
        }
        if (typeof action === 'object' && 'move' in action) {
            return (action as BotMove).move;
        }
        return null;
    }

    /**
     * Extracts the move arguments from a GameAction (BotMove or ActionShape).
     */
    public static getMoveArgs(action: GameAction): MoveArguments[keyof MoveArguments] | null {
        if (!action) return null;
        if (typeof action === 'object' && 'payload' in action && action.payload) {
            return action.payload.args;
        }
        if (typeof action === 'object' && 'args' in action) {
            return (action as BotMove).args;
        }
        return null;
    }
}
