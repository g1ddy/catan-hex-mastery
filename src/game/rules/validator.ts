import { GameState } from '../types';
import { Ctx } from 'boardgame.io';
import { validateBuildRoad, validateBuildSettlement, validateBuildCity } from './gameplay';
import { validateSettlementLocation, isValidSetupRoadPlacement, ValidationResult } from './spatial';

/**
 * The Rule Engine Facade.
 * Centralizes validation for all moves.
 */
export const RuleEngine = {
    /**
     * Validates a move and returns a result object.
     */
    validateMove: (G: GameState, ctx: Ctx, moveName: string, args: any[]): ValidationResult => {
        const playerID = ctx.currentPlayer;

        switch (moveName) {
            // Gameplay Moves
            case 'buildRoad':
                return validateBuildRoad(G, playerID, args[0]);
            case 'buildSettlement':
                return validateBuildSettlement(G, playerID, args[0]);
            case 'buildCity':
                return validateBuildCity(G, playerID, args[0]);

            // Setup Moves
            case 'placeSettlement':
                // In Setup, "placeSettlement" checks geometric rules but ignores cost/connectivity to road
                return validateSettlementLocation(G, args[0]);
            case 'placeRoad':
                // In Setup, "placeRoad" must connect to the just-placed settlement
                return isValidSetupRoadPlacement(G, args[0], playerID);

            default:
                return { isValid: false, reason: `Unknown move: ${moveName}` };
        }
    },

    /**
     * Validates a move and throws an error if invalid.
     * Used by move handlers to abort execution.
     */
    validateMoveOrThrow: (G: GameState, ctx: Ctx, moveName: string, args: any[]): void => {
        const result = RuleEngine.validateMove(G, ctx, moveName, args);
        if (!result.isValid) {
            throw new Error(result.reason || "Invalid move");
        }
    }
};

// Re-export specific validators for legacy support (if needed by AI/UI temporarily)
// Eventually, consumers should use the Facade or specific modules.
export { getValidMovesForStage, getValidSetupSettlementSpots, getValidSettlementSpots, getValidCitySpots } from './legacyValidator';
