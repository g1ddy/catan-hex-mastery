import React, { useState, useEffect } from 'react';
import { HexGrid, Layout } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState } from '../game/types';
import { GameHex } from './GameHex';
import { PlayerPanel } from './PlayerPanel';
import AnalystPanel from './AnalystPanel';
import { CoachPanel } from './CoachPanel';
import { GameLayout } from './GameLayout';
import { BOARD_CONFIG, BOARD_VIEWBOX } from '../game/config';
import { GameControls, BuildMode, UiMode, GameControlsProps } from './GameControls';
import { CoachRecommendation, Coach, StrategicAdvice } from '../game/analysis/coach';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { Z_INDEX_TOOLTIP } from '../styles/z-indices';
import { GameStatusBanner, CustomMessage } from './GameStatusBanner';
import { PHASES, STAGE_MOVES, STAGES } from '../game/constants';
import { HexOverlays } from './HexOverlays';
import { useIsMobile } from '../hooks/useIsMobile';
import { isValidRobberPlacement } from '../game/rules/spatial';
import { Hex } from '../game/types';

const MESSAGE_BOARD_REGENERATED = "Board Regenerated!";

export interface CatanBoardProps extends BoardProps<GameState> {
  onPlayerChange?: (playerID: string) => void;
}

interface CoachData {
    recommendations: Record<string, CoachRecommendation>;
    minScore: number;
    maxScore: number;
    top3Set: Set<string>;
}

export const Board: React.FC<CatanBoardProps> = ({ G, ctx, moves, playerID, onPlayerChange }) => {
  const hexes = Object.values(G.board.hexes);
  const isMobile = useIsMobile();

  // Auto-switch Identity in Hotseat Mode
  React.useEffect(() => {
    if (onPlayerChange && playerID !== ctx.currentPlayer) {
      onPlayerChange(ctx.currentPlayer);
    }
  }, [ctx.currentPlayer, playerID, onPlayerChange]);

  const [producingHexIds, setProducingHexIds] = useState<string[]>([]);
  const [showResourceHeatmap, setShowResourceHeatmap] = useState<boolean>(false);
  const [isCoachModeEnabled, setIsCoachModeEnabled] = useState<boolean>(true);
  const [customBannerMessage, setCustomBannerMessage] = useState<CustomMessage | null>(null);
  const [pendingRobberHex, setPendingRobberHex] = useState<string | null>(null);

  // Reset pending robber hex on turn/stage change
  useEffect(() => {
    setPendingRobberHex(null);
  }, [ctx.currentPlayer, ctx.activePlayers]);

  const handleHexClick = (hex: Hex) => {
    const stage = ctx.activePlayers?.[ctx.currentPlayer];
    if (ctx.phase === PHASES.GAMEPLAY && stage === STAGES.ROBBER) {
        if (isValidRobberPlacement(G, hex.id).isValid) {
            setPendingRobberHex(hex.id);
        }
    }
  };

  // Active Panel State (Lifted from GameLayout)
  // Default to Analyst on desktop, unless handled by effect
  const [activePanel, setActivePanel] = useState<'analyst' | 'coach' | null>(!isMobile ? 'analyst' : null);

  // Auto-expand Coach Panel on entering Gameplay Phase (Desktop only)
  useEffect(() => {
      if (!isMobile && ctx.phase === PHASES.GAMEPLAY) {
          setActivePanel('coach');
      }
  }, [ctx.phase, isMobile]);

  // Visualize Roll & Rewards
  React.useEffect(() => {
      const [d1, d2] = G.lastRoll;
      const sum = d1 + d2;

      if (sum === 0) return; // Initial state

      // 1. Highlight Hexes
      const activeIds = hexes.filter(h => h.tokenValue === sum).map(h => h.id);

      if (activeIds.length > 0) {
          setProducingHexIds(activeIds);
          setTimeout(() => setProducingHexIds([]), 3000);
      }
  }, [G.lastRoll]);

  const [buildMode, setBuildMode] = useState<BuildMode>(null);
  const [uiMode, setUiMode] = useState<UiMode>('viewing');

    // Calculate Strategic Advice (Lifted from GameControls/CoachPanel)
    const strategicAdvice: StrategicAdvice | null = React.useMemo(() => {
        if (!isCoachModeEnabled) return null;
        const coach = new Coach(G);
        return coach.getStrategicAdvice(ctx.currentPlayer, ctx);
    }, [G, ctx, isCoachModeEnabled]);

    // Calculate Coach Data at Board Level (O(Vertices)) instead of per-hex
    const currentPlayerSettlements = G.players[ctx.currentPlayer]?.settlements;
    const coachData: CoachData = React.useMemo(() => {
        const EMPTY_COACH_DATA: CoachData = { recommendations: {}, minScore: 0, maxScore: 0, top3Set: new Set<string>() };

        if (!isCoachModeEnabled) {
            return EMPTY_COACH_DATA;
        }

        // Active when placing settlement in Setup OR Gameplay
        const isSetupPlacing = ctx.phase === PHASES.SETUP && uiMode === 'placing';
        const isGamePlacing = (ctx.phase === PHASES.GAMEPLAY) && buildMode === 'settlement';

        if (!isSetupPlacing && !isGamePlacing) {
            return EMPTY_COACH_DATA;
        }

        // Use ctx.coach if available (Plugin), otherwise fall back to creating a transient instance
        // Casting ctx to any because standard boardgame.io Ctx doesn't have plugins typed yet
        const coach = (ctx as any).coach as Coach;

        let allScores: CoachRecommendation[] = [];
        if (coach && typeof coach.getAllSettlementScores === 'function') {
            allScores = coach.getAllSettlementScores(ctx.currentPlayer, ctx);
        } else {
             // Fallback if plugin not loaded or visible
             allScores = new Coach(G).getAllSettlementScores(ctx.currentPlayer, ctx);
        }

        if (allScores.length === 0) {
            return EMPTY_COACH_DATA;
        }

        const vals = allScores.map(s => s.score);
        const sorted = [...allScores].sort((a, b) => b.score - a.score);
        const top3Ids = sorted.slice(0, 3).map(s => s.vertexId);

        // Convert to Map for O(1) Lookup
        const recMap = Object.fromEntries(allScores.map(rec => [rec.vertexId, rec]));

        return {
            recommendations: recMap,
            minScore: Math.min(...vals),
            maxScore: Math.max(...vals),
            top3Set: new Set(top3Ids)
        };
    }, [G.board, G.boardStats, currentPlayerSettlements, ctx.phase, uiMode, buildMode, ctx.currentPlayer, isCoachModeEnabled]);

  const handleSetCoachModeEnabled = (enabled: boolean) => {
      setIsCoachModeEnabled(enabled);
      if (!enabled) {
          setShowResourceHeatmap(false);
      }
  };

  const BoardContent = (
    <div className="board absolute inset-0 overflow-hidden">
        {/* Tooltip for Coach Mode */}
        <Tooltip
            id="coach-tooltip"
            place="top"
            className="coach-tooltip"
            style={{ zIndex: Z_INDEX_TOOLTIP }}
            render={({ content }) => {
                if (!content) return null;
                const rec = coachData.recommendations[content];
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
        />

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
            G={G}
            ctx={ctx}
            playerID={playerID}
            uiMode={uiMode}
            buildMode={buildMode}
            customMessage={customBannerMessage}
            onCustomMessageClear={() => setCustomBannerMessage(null)}
        />
      }
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
