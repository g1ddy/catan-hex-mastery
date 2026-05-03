import { GameState, MoveArguments } from '../core/types';
import { Ctx } from 'boardgame.io';
import { validateBuildRoad, validateBuildSettlement, validateBuildCity, validateTradeBank, validateRobberMove, validateRoll, validateResolveRoll, validateEndTurn } from './moveValidation';
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

        const validators: Record<string, () => ValidationResult> = {
            'buildRoad': () => validateBuildRoad(G, playerID, safeArgs[0]),
            'buildSettlement': () => validateBuildSettlement(G, playerID, safeArgs[0]),
            'buildCity': () => validateBuildCity(G, playerID, safeArgs[0]),
            'tradeBank': () => validateTradeBank(G, playerID),
            'placeSettlement': () => validateSettlementLocation(G, safeArgs[0]),
            'placeRoad': () => isValidSetupRoadPlacement(G, safeArgs[0], playerID),
            'dismissRobber': () => validateRobberMove(G, playerID, safeArgs[0], safeArgs[1]),
            'rollDice': () => validateRoll(G, playerID),
            'resolveRoll': () => validateResolveRoll(G, playerID),
            'endTurn': () => validateEndTurn(G, ctx, playerID),
        };

        const validateFn = validators[moveName as string];
        if (validateFn) {
            return validateFn();
        }

        return { isValid: false, reason: `Unknown move: ${moveName}` };
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
