import { GameState, RollStatus } from '../core/types';
import { Ctx } from 'boardgame.io';
import { STAGES } from '../core/constants';
import { canAffordRoad, canAffordSettlement, canAffordCity } from './economy';
import { isValidRoadPlacement, isValidCityPlacement, isValidSettlementPlacement, ValidationResult, isValidRobberPlacement } from './spatial';
import { calculateTrade, TradeResult, getExchangeRates } from '../mechanics/trade';
import { isValidPlayer } from '../core/validation';
import { BANK_TRADE_GIVE_AMOUNT } from '../core/config';
import { getVerticesForHex } from '../geometry/hexUtils';
import { safeGet } from '../../game/core/utils/objectUtils';
import { getPotentialVictims } from './robberRules';

/**
 * Validates the "Build Road" move during the Gameplay Phase.
 */
export const validateBuildRoad = (G: GameState, playerID: string, edgeId: string): ValidationResult => {
    if (!canAffordRoad(G, playerID)) {
        return { isValid: false, reason: "Not enough resources to build a road (requires Wood, Brick)" };
    }
    return isValidRoadPlacement(G, edgeId, playerID);
};

/**
 * Validates the "Build Settlement" move during the Gameplay Phase.
 */
export const validateBuildSettlement = (G: GameState, playerID: string, vertexId: string): ValidationResult => {
    if (!canAffordSettlement(G, playerID)) {
        return { isValid: false, reason: "Not enough resources to build a settlement (requires Wood, Brick, Wheat, Sheep)" };
    }
    return isValidSettlementPlacement(G, vertexId, playerID);
};

/**
 * Validates the "Build City" move during the Gameplay Phase.
 */
export const validateBuildCity = (G: GameState, playerID: string, vertexId: string): ValidationResult => {
    if (!canAffordCity(G, playerID)) {
        return { isValid: false, reason: "Not enough resources to build a city (requires 3 Ore, 2 Wheat)" };
    }
    return isValidCityPlacement(G, vertexId, playerID);
};

/**
 * Validates the "Trade Bank" move.
 */
export const validateTradeBank = (G: GameState, playerID: string): ValidationResult<TradeResult> => {
    if (!isValidPlayer(playerID, G)) {
        return { isValid: false, reason: "Invalid player" };
    }

    const player = G.players[playerID];
    const { rates, portEdges } = getExchangeRates(G, playerID);
    const tradeResult = calculateTrade(player.resources, rates, portEdges);

    if (!tradeResult.canTrade) {
        return { isValid: false, reason: `You need at least ${BANK_TRADE_GIVE_AMOUNT} of a resource (or less with ports) to trade.` };
    }

    return { isValid: true, data: tradeResult };
};

/**
 * Validates the "Dismiss Robber" move (Move Robber + Steal).
 */
export const validateRobberMove = (G: GameState, playerID: string, hexID: string, victimID?: string): ValidationResult => {
    const spatialCheck = isValidRobberPlacement(G, hexID);
    if (!spatialCheck.isValid) {
        return spatialCheck;
    }

    const potentialVictims = getPotentialVictims(G, hexID, playerID);

    if (victimID) {
        if (!potentialVictims.has(victimID)) {
            const hex = safeGet(G.board.hexes, hexID);
            if (!hex) return { isValid: false, reason: "Invalid hex." }; // Should be caught by spatial check

            const vertices = getVerticesForHex(hex.coords);
            const isOnHex = vertices.some(vId => safeGet(G.board.vertices, vId)?.owner === victimID);

            if (!isOnHex) {
                 return { isValid: false, reason: "The chosen victim does not have a settlement on this hex." };
            }
            return { isValid: false, reason: "The chosen victim has no resources to steal." };
        }
    }

    return { isValid: true };
};

/**
 * Validates the "End Turn" move.
 */
export const validateEndTurn = (G: GameState, ctx: Ctx, playerID: string): ValidationResult => {
    if (!isValidPlayer(playerID, G)) {
        return { isValid: false, reason: "Invalid player" };
    }

    const stage = ctx.activePlayers?.[playerID];
    if (!stage) {
        return { isValid: false, reason: "It is not your turn to act." };
    }
    if (stage !== STAGES.ACTING) {
        return { isValid: false, reason: "You can only end your turn during the acting phase." };
    }

    return { isValid: true };
};

/**
 * Validates the "Roll Dice" move.
 */
export const validateRoll = (G: GameState, playerID: string): ValidationResult => {
    if (!isValidPlayer(playerID, G)) {
        return { isValid: false, reason: "Invalid player" };
    }

    if (G.rollStatus !== RollStatus.IDLE) {
        return { isValid: false, reason: "Dice have already been rolled this turn." };
    }

    return { isValid: true };
};

/**
 * Validates the "Resolve Roll" move.
 */
export const validateResolveRoll = (G: GameState, playerID: string): ValidationResult => {
    if (!isValidPlayer(playerID, G)) {
        return { isValid: false, reason: "Invalid player" };
    }

    if (G.rollStatus !== RollStatus.ROLLING) {
        return { isValid: false, reason: "Game is not in ROLLING status." };
    }

    return { isValid: true };
};
