import { useState, useEffect } from 'react';
import { GameState } from '../../../game/core/types';

export const useGameEffects = (G: GameState) => {
    const [producingHexIds, setProducingHexIds] = useState<string[]>([]);

    useEffect(() => {
        const hexes = Object.values(G.board.hexes);
        const [d1, d2] = G.lastRoll;
        const sum = d1 + d2;

        if (sum === 0) return; // Initial state

        // 1. Highlight Hexes
        const activeIds = hexes.filter(h => h.tokenValue === sum).map(h => h.id);

        if (activeIds.length > 0) {
            setProducingHexIds(activeIds);
            setTimeout(() => setProducingHexIds([]), 3000);
        }
    }, [G.lastRoll, G.board.hexes]);

    return { producingHexIds };
};
