import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, Hex } from '../../../game/core/types';
import { Ctx } from 'boardgame.io';
import { PHASES, STAGES, STAGE_MOVES } from '../../../game/core/constants';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { getValidRobberLocations } from '../../../game/rules/queries';
import { CustomMessage } from '../../hud/hooks/useGameStatusMessage';
import { BuildMode, UiMode } from '../../shared/types';

export const useGameScreenState = (
    G: GameState,
    ctx: Ctx,
    playerID: string | null,
    onPlayerChange?: (playerID: string) => void
) => {
    const isMobile = useIsMobile();

    // Auto-switch Identity in Hotseat Mode
    useEffect(() => {
        if (onPlayerChange && playerID && playerID !== ctx.currentPlayer) {
            onPlayerChange(ctx.currentPlayer);
        }
    }, [ctx.currentPlayer, playerID, onPlayerChange]);

    const [showResourceHeatmap, setShowResourceHeatmap] = useState<boolean>(false);
    const [isCoachModeEnabled, setIsCoachModeEnabled] = useState<boolean>(true);
    const [customBannerMessage, setCustomBannerMessage] = useState<CustomMessage | null>(null);
    const [pendingRobberHex, setPendingRobberHex] = useState<string | null>(null);
    const [buildMode, setBuildMode] = useState<BuildMode>(null);
    const [uiMode, setUiMode] = useState<UiMode>('viewing');

    // Active Panel State
    const [activePanel, setActivePanel] = useState<'analyst' | 'coach' | null>(!isMobile ? 'analyst' : null);

    // Reset pending robber hex on turn/stage change
    useEffect(() => {
        setPendingRobberHex(null);
    }, [ctx.currentPlayer, ctx.activePlayers]);

    // Auto-expand Coach Panel on entering Gameplay Phase (Desktop only)
    useEffect(() => {
        if (!isMobile && ctx.phase === PHASES.GAMEPLAY) {
            setActivePanel('coach');
        }
    }, [ctx.phase, isMobile]);

    // Ref to access latest state in callback without triggering re-creation
    const stateRef = useRef({ G, ctx });
    stateRef.current = { G, ctx };

    const handleHexClick = useCallback((hex: Hex) => {
        const { G, ctx } = stateRef.current;
        const stage = ctx.activePlayers?.[ctx.currentPlayer];
        if (ctx.phase === PHASES.GAMEPLAY && stage === STAGES.ROBBER) {
            if (getValidRobberLocations(G).has(hex.id)) {
                setPendingRobberHex(hex.id);
            }
        }
    }, []);

    const handleSetCoachModeEnabled = (enabled: boolean) => {
        setIsCoachModeEnabled(enabled);
        if (!enabled) {
            setShowResourceHeatmap(false);
        }
    };

    const handleCustomMessageClear = () => setCustomBannerMessage(null);

    const canRegenerateBoard = useMemo(() => {
         const stage = ctx.activePlayers?.[ctx.currentPlayer];
         if (!stage) return false;

         if (stage in STAGE_MOVES) {
             const allowedMoves = STAGE_MOVES[stage as keyof typeof STAGE_MOVES];
             return (allowedMoves as readonly string[]).includes('regenerateBoard');
         }
         return false;
    }, [ctx.activePlayers, ctx.currentPlayer]);

    return {
        isMobile,
        showResourceHeatmap,
        setShowResourceHeatmap,
        isCoachModeEnabled,
        handleSetCoachModeEnabled,
        customBannerMessage,
        setCustomBannerMessage,
        handleCustomMessageClear,
        pendingRobberHex,
        activePanel,
        setActivePanel,
        buildMode,
        setBuildMode,
        uiMode,
        setUiMode,
        handleHexClick,
        canRegenerateBoard
    };
};
