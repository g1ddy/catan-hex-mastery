import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Hex } from '../../../game/core/types';
import { GameLayout } from './GameLayout';
import { Coach, StrategicAdvice } from '../../../game/analysis/coach';
import { PHASES, STAGE_MOVES, STAGES } from '../../../game/core/constants';
import { useTradeLogic } from '../../hud/hooks/useTradeLogic';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { getValidRobberLocations } from '../../../game/rules/queries';
import { useCoachData } from '../../coach/hooks/useCoachData';
import { BuildMode, UiMode, GameControlsProps } from '../../hud/components/GameControls';
import { CustomMessage } from '../../hud/components/GameStatusBanner';

// Feature Layers
import { BoardLayer } from '../../board/BoardLayer';
import { HUDLayer } from '../../hud/HUDLayer';
import { CoachLayer } from '../../coach/CoachLayer';

const MESSAGE_BOARD_REGENERATED = "Board Regenerated!";

export interface GameScreenProps extends BoardProps<GameState> {
  onPlayerChange?: (playerID: string) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ G, ctx, moves, playerID, onPlayerChange }) => {
  const isMobile = useIsMobile();

  // Auto-switch Identity in Hotseat Mode
  React.useEffect(() => {
    if (onPlayerChange && playerID !== ctx.currentPlayer) {
      onPlayerChange(ctx.currentPlayer);
    }
  }, [ctx.currentPlayer, playerID, onPlayerChange]);

  const [showResourceHeatmap, setShowResourceHeatmap] = useState<boolean>(false);
  const [isCoachModeEnabled, setIsCoachModeEnabled] = useState<boolean>(true);
  const [customBannerMessage, setCustomBannerMessage] = useState<CustomMessage | null>(null);
  const [pendingRobberHex, setPendingRobberHex] = useState<string | null>(null);

  // Reset pending robber hex on turn/stage change
  useEffect(() => {
    setPendingRobberHex(null);
  }, [ctx.currentPlayer, ctx.activePlayers]);

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
  }, [setPendingRobberHex]);

  // Active Panel State (Lifted from GameLayout)
  // Default to Analyst on desktop, unless handled by effect
  const [activePanel, setActivePanel] = useState<'analyst' | 'coach' | null>(!isMobile ? 'analyst' : null);

  // Auto-expand Coach Panel on entering Gameplay Phase (Desktop only)
  useEffect(() => {
      if (!isMobile && ctx.phase === PHASES.GAMEPLAY) {
          setActivePanel('coach');
      }
  }, [ctx.phase, isMobile]);

  const [buildMode, setBuildMode] = useState<BuildMode>(null);
  const [uiMode, setUiMode] = useState<UiMode>('viewing');

    // Calculate Strategic Advice (Lifted from GameControls/CoachPanel)
    const strategicAdvice: StrategicAdvice | null = React.useMemo(() => {
        if (!isCoachModeEnabled) return null;
        const coach = new Coach(G);
        return coach.getStrategicAdvice(ctx.currentPlayer, ctx);
    }, [G, ctx, isCoachModeEnabled]);

    // Calculate Coach Data using extracted hook
    const coachData = useCoachData(G, ctx, buildMode, uiMode, isCoachModeEnabled);

  const handleSetCoachModeEnabled = (enabled: boolean) => {
      setIsCoachModeEnabled(enabled);
      if (!enabled) {
          setShowResourceHeatmap(false);
      }
  };

  // Calculate active port for highlighting
  const { highlightedPortEdgeId } = useTradeLogic(G, ctx);

  return (
    <GameLayout
      board={
        <BoardLayer
            G={G}
            ctx={ctx}
            moves={moves}
            coachData={coachData}
            buildMode={buildMode}
            setBuildMode={setBuildMode}
            uiMode={uiMode}
            setUiMode={setUiMode}
            showResourceHeatmap={showResourceHeatmap}
            highlightedPortEdgeId={highlightedPortEdgeId}
            pendingRobberHex={pendingRobberHex}
            onHexClick={handleHexClick}
        />
      }
      playerPanel={
        <HUDLayer.PlayerPanel
          players={G.players}
          currentPlayerId={ctx.currentPlayer}
        />
      }
      gameStatus={
        <HUDLayer.Banner
            ctx={ctx}
            playerID={playerID}
            uiMode={uiMode}
            buildMode={buildMode}
            customMessage={customBannerMessage}
            onCustomMessageClear={() => setCustomBannerMessage(null)}
        />
      }
      gameNotification={<HUDLayer.Notification G={G} />}
      gameControls={
        <HUDLayer.Controls
          G={G}
          ctx={ctx}
          moves={moves as unknown as GameControlsProps['moves']}
          buildMode={buildMode}
          setBuildMode={setBuildMode}
          uiMode={uiMode}
          setUiMode={setUiMode}
          isCoachModeEnabled={isCoachModeEnabled}
          advice={strategicAdvice}
          pendingRobberHex={pendingRobberHex}
        />
      }
      dashboard={
        <CoachLayer.Analyst
          stats={G.boardStats}
          G={G}
          onRegenerate={() => {
              moves.regenerateBoard();
              setCustomBannerMessage({ text: MESSAGE_BOARD_REGENERATED, type: 'success' });
          }}
          canRegenerate={(() => {
            const stage = ctx.activePlayers?.[ctx.currentPlayer];
            if (!stage) return false;
            const allowedMoves = STAGE_MOVES[stage as keyof typeof STAGE_MOVES];
            return (allowedMoves as readonly string[])?.includes('regenerateBoard') ?? false;
          })()}
        />
      }
      coachPanel={
          <CoachLayer.Coach
              G={G}
              ctx={ctx}
              showResourceHeatmap={showResourceHeatmap}
              setShowResourceHeatmap={setShowResourceHeatmap}
              isCoachModeEnabled={isCoachModeEnabled}
              setIsCoachModeEnabled={handleSetCoachModeEnabled}
              advice={strategicAdvice}
          />
      }
      activePanel={activePanel}
      onPanelChange={setActivePanel}
    />
  );
};
