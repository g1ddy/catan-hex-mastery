import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HexGrid, Layout } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState } from '../../../game/core/types';
import { GameHex } from '../../board/components/GameHex';
import { PlayerPanel } from '../../hud/components/PlayerPanel';
import AnalystPanel from '../../coach/components/AnalystPanel';
import { CoachPanel } from '../../coach/components/CoachPanel';
import { GameLayout } from './GameLayout';
import { BOARD_CONFIG, BOARD_VIEWBOX } from '../../../game/core/config';
import { GameControls, BuildMode, UiMode, GameControlsProps } from '../../hud/components/GameControls';
import { Coach, StrategicAdvice } from '../../../game/analysis/coach';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { Z_INDEX_TOOLTIP } from '../../../styles/z-indices';
import { GameStatusBanner, CustomMessage } from '../../hud/components/GameStatusBanner';
import { GameNotification } from '../../hud/components/GameNotification';
import { PHASES, STAGE_MOVES, STAGES } from '../../../game/core/constants';
import { useTradeLogic } from '../../hud/hooks/useTradeLogic';
import { HexOverlays } from '../../board/components/HexOverlays';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { getValidRobberLocations } from '../../../game/rules/queries';
import { Hex } from '../../../game/core/types';
import { useCoachData } from '../../coach/hooks/useCoachData';
import { useGameEffects } from '../hooks/useGameEffects';

const MESSAGE_BOARD_REGENERATED = "Board Regenerated!";

export interface GameScreenProps extends BoardProps<GameState> {
  onPlayerChange?: (playerID: string) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ G, ctx, moves, playerID, onPlayerChange }) => {
  const hexes = Object.values(G.board.hexes);
  const isMobile = useIsMobile();

  // Auto-switch Identity in Hotseat Mode
  React.useEffect(() => {
    if (onPlayerChange && playerID !== ctx.currentPlayer) {
      onPlayerChange(ctx.currentPlayer);
    }
  }, [ctx.currentPlayer, playerID, onPlayerChange]);

  // Game Effects (Visuals)
  const { producingHexIds } = useGameEffects(G);

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

  const BoardContent = (
    <div className="board absolute inset-0 overflow-hidden">
        {createPortal(
            <Tooltip
                id="coach-tooltip"
                place="top"
                className="coach-tooltip"
                style={{ zIndex: Z_INDEX_TOOLTIP }}
                render={({ content }) => {
                    if (!content) return null;
                    const rec = coachData.recommendations.get(content);
                    if (!rec) return null;

                    const { score, details } = rec;
                    const parts = [];
                    // Pips
                    parts.push(details.pips >= 10 ? 'High Pips' : `${details.pips} Pips`);
                    // Scarcity
                    if (details.scarcityBonus && details.scarceResources.length > 0) {
                        parts.push(`Rare ${details.scarceResources.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join('/')}`);
                    }
                    // Diversity
                    if (details.diversityBonus) {
                        parts.push('High Diversity');
                    }
                    // Synergy
                    if (details.synergyBonus) {
                        parts.push('Synergy');
                    }
                    // Needed
                    if (details.neededResources.length > 0) {
                        parts.push(`Missing ${details.neededResources.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join('/')}`);
                    }
                    return (
                        <div>
                            <div className="font-bold mb-1">Score: {score}</div>
                            <div className="text-xs text-slate-300">{parts.join(' + ')}</div>
                        </div>
                    );
                }}
            />,
            document.body
        )}
      <HexGrid
        width="100%"
        height="100%"
        viewBox={BOARD_VIEWBOX}
        className="hex-grid-svg absolute top-0 left-0 w-full h-full block"
      >
        <Layout
          size={BOARD_CONFIG.HEX_SIZE}
          flat={false}
          spacing={BOARD_CONFIG.HEX_SPACING}
          origin={BOARD_CONFIG.HEX_ORIGIN}
        >
          <g>
            {hexes.map(hex => (
              <GameHex
                key={hex.id}
                hex={hex}
                onClick={handleHexClick}
                isProducing={producingHexIds.includes(hex.id)}
                hasRobber={G.robberLocation === hex.id && pendingRobberHex === null}
                isPendingRobber={pendingRobberHex === hex.id}
              />
            ))}
          </g>
          <g>
            {hexes.map(hex => (
              <HexOverlays
                key={`overlay-${hex.id}`}
                hex={hex}
                G={G}
                ctx={ctx}
                moves={moves}
                buildMode={buildMode}
                setBuildMode={setBuildMode}
                uiMode={uiMode}
                setUiMode={setUiMode}
                showResourceHeatmap={showResourceHeatmap}
                coachData={coachData}
                highlightedPortEdgeId={highlightedPortEdgeId}
              />
            ))}
          </g>
        </Layout>
      </HexGrid>
    </div>
  );

  return (
    <GameLayout
      board={BoardContent}
      playerPanel={
        <PlayerPanel
          players={G.players}
          currentPlayerId={ctx.currentPlayer}
        />
      }
      gameStatus={
        <GameStatusBanner
            ctx={ctx}
            playerID={playerID}
            uiMode={uiMode}
            buildMode={buildMode}
            customMessage={customBannerMessage}
            onCustomMessageClear={() => setCustomBannerMessage(null)}
        />
      }
      gameNotification={<GameNotification G={G} />}
      gameControls={
        <GameControls
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
        <AnalystPanel
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
          <CoachPanel
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
