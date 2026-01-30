import { GameState, MoveArguments } from '../core/types';
import { Ctx } from 'boardgame.io';
import { validateBuildRoad, validateBuildSettlement, validateBuildCity, validateTradeBank, validateRobberMove, validateRoll, validateResolveRoll } from './moveValidation';
import {
    validateSettlementLocation,
    isValidSetupRoadPlacement,
    ValidationResult
} from './spatial';

/**
 * The Rule Engine Facade.
 * Centralizes validation for all moves.
 */
export const RuleEngine = {
    /**
     * Validates a move and returns a result object.
     */
    validateMove: <M extends keyof MoveArguments>(G: GameState, ctx: Ctx, moveName: M, args: MoveArguments[M]): ValidationResult => {
        const playerID = ctx.currentPlayer;
        // Cast args to any[] internally to simplify access in switch cases,
        // relying on the correlation between moveName and args enforced by the signature.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const safeArgs = args as any[];

        switch (moveName) {
            // Gameplay Moves
            case 'buildRoad':
                return validateBuildRoad(G, playerID, safeArgs[0]);
            case 'buildSettlement':
                return validateBuildSettlement(G, playerID, safeArgs[0]);
            case 'buildCity':
                return validateBuildCity(G, playerID, safeArgs[0]);
            case 'tradeBank':
                return validateTradeBank(G, playerID);

            // Setup Moves
            case 'placeSettlement':
                // In Setup, "placeSettlement" checks geometric rules but ignores cost/connectivity to road
                return validateSettlementLocation(G, safeArgs[0]);
            case 'placeRoad':
                // In Setup, "placeRoad" must connect to the just-placed settlement
                return isValidSetupRoadPlacement(G, safeArgs[0], playerID);

            case 'dismissRobber':
                return validateRobberMove(G, playerID, safeArgs[0], safeArgs[1]);

            case 'rollDice':
                return validateRoll(G, playerID);

            case 'resolveRoll':
                return validateResolveRoll(G, playerID);

            case 'noOp':
                return { isValid: true };

            default:
                return { isValid: false, reason: `Unknown move: ${moveName}` };
        }
    },

    /**
     * Validates a move and throws an error if invalid.
     * Used by move handlers to abort execution.
     * @returns The data payload from the validation result if valid (and if present).
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validateMoveOrThrow: <M extends keyof MoveArguments, T = any>(G: GameState, ctx: Ctx, moveName: M, args: MoveArguments[M]): T | undefined => {
        const result = RuleEngine.validateMove(G, ctx, moveName, args);
        if (!result.isValid) {
            throw new Error(result.reason || "Invalid move");
        }
        return result.data as T;
    }
};
