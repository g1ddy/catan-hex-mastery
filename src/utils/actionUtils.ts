import { GameAction, BotMove, MoveArguments } from '../game/core/types';

export class ActionUtils {
    /**
     * Extracts the move name from a GameAction (BotMove or ActionShape).
     */
    public static getMoveName(action: GameAction): keyof MoveArguments {
        if ('payload' in action) {
            return action.payload.type;
        }
        return (action as BotMove).move;
    }

    /**
     * Extracts the move arguments from a GameAction (BotMove or ActionShape).
     */
    public static getMoveArgs(action: GameAction): MoveArguments[keyof MoveArguments] {
        if ('payload' in action) {
            return action.payload.args;
        }
        return (action as BotMove).args;
    }
}
