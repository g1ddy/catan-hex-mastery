import { GameState } from '../../core/types';
import { isValidPlayer } from '../../../utils/validation';
import { calculateTrade } from '../../mechanics/trade';
import { ORE_RESERVE_THRESHOLD } from '../coach';

export class TradeAdvisor {
    private G: GameState;

    constructor(G: GameState) {
        this.G = G;
    }

    /**
     * Evaluates if a Bank Trade is safe or advisable for the player.
     * Enforces "Smart Ban" logic (e.g., don't trade Ore if low).
     */
    public evaluateTrade(playerID: string): { isSafe: boolean, reason?: string } {
        if (!isValidPlayer(playerID, this.G)) {
            return { isSafe: false, reason: "Invalid Player" };
        }

        const player = this.G.players[playerID];
        const tradeResult = calculateTrade(player.resources);

        if (!tradeResult.canTrade) {
            return { isSafe: false, reason: "Cannot Afford Trade" };
        }

        // Smart Ban: Protect Ore (City bottleneck)
        if (tradeResult.give === 'ore' && player.resources.ore <= ORE_RESERVE_THRESHOLD) {
            return { isSafe: false, reason: "Ore Reserve Low" };
        }

        return { isSafe: true };
    }
}
