import React, { useState } from 'react';
import { HexGrid, Layout } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState } from '../game/types';
import { GameHex } from './GameHex';
import { PlayerPanel } from './PlayerPanel';
import AnalystPanel from './AnalystPanel';
import { GameLayout } from './GameLayout';
import { BOARD_CONFIG, BOARD_VIEWBOX } from '../game/config';
import { GameControls, BuildMode, UiMode, GameControlsProps } from './GameControls';
import { CoachRecommendation, Coach } from '../game/analysis/coach';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { Z_INDEX_TOOLTIP } from '../styles/z-indices';
import { GameStatusBanner } from './GameStatusBanner';
import { PHASES, STAGE_MOVES } from '../game/constants';
import { HexOverlays } from './HexOverlays';

const NO_OP = () => {};

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

  // Auto-switch Identity in Hotseat Mode
  React.useEffect(() => {
    if (onPlayerChange && playerID !== ctx.currentPlayer) {
      onPlayerChange(ctx.currentPlayer);
    }
  }, [ctx.currentPlayer, playerID, onPlayerChange]);

  const [producingHexIds, setProducingHexIds] = useState<string[]>([]);
  const [showCoachMode, setShowCoachMode] = useState<boolean>(false);

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

    // Calculate Coach Data at Board Level (O(Vertices)) instead of per-hex
    const coachData: CoachData = React.useMemo(() => {
        const EMPTY_COACH_DATA: CoachData = { recommendations: {}, minScore: 0, maxScore: 0, top3Set: new Set<string>() };

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
            allScores = coach.getAllSettlementScores(ctx.currentPlayer);
        } else {
             // Fallback if plugin not loaded or visible
             allScores = new Coach(G).getAllSettlementScores(ctx.currentPlayer);
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
    }, [G, ctx.phase, uiMode, buildMode, ctx.currentPlayer]);

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
                let rec: CoachRecommendation;
                try {
                  const parsed = JSON.parse(content);
                  if (parsed && typeof parsed === 'object' && 'score' in parsed && 'details' in parsed) {
                    rec = parsed as CoachRecommendation;
                  } else {
                    throw new Error('Invalid CoachRecommendation structure');
                  }
                } catch (e) {
                  console.error('Failed to parse or validate coach tooltip content:', e);
                  return null;
                }
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
                onClick={NO_OP}
                isProducing={producingHexIds.includes(hex.id)}
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
                showCoachMode={showCoachMode}
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
        />
      }
      dashboard={
        <AnalystPanel
          stats={G.boardStats}
          G={G}
          onRegenerate={() => moves.regenerateBoard()}
          canRegenerate={(() => {
            const stage = ctx.activePlayers?.[ctx.currentPlayer];
            if (!stage) return false;
            const allowedMoves = STAGE_MOVES[stage as keyof typeof STAGE_MOVES];
            return (allowedMoves as readonly string[])?.includes('regenerateBoard') ?? false;
          })()}
          showCoachMode={showCoachMode}
          setShowCoachMode={setShowCoachMode}
        />
      }
    />
  );
};
