import React, { useState } from 'react';
import { HexGrid, Layout, Hexagon } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Hex } from '../game/types';
import { GameHex } from './GameHex';
import { getVerticesForHex, getEdgesForHex, getEdgesForVertex, getVerticesForEdge } from '../game/hexUtils';
import { hexCornerOffset } from '../game/geometry';
import { PlayerPanel } from './PlayerPanel';
import AnalystPanel from './AnalystPanel';
import { GameLayout } from './GameLayout';
import { useResponsiveViewBox } from '../hooks/useResponsiveViewBox';
import { BOARD_CONFIG } from '../game/config';
import { GameControls, BuildMode, UiMode, GameControlsProps } from './GameControls';
import { getAllSettlementScores, getHeatmapColor } from '../game/analysis/coach';
import { CoachRecommendation } from '../game/analysis/coach';
import toast from 'react-hot-toast';
import { safeMove } from '../utils/moveUtils';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { ProductionToast } from './ProductionToast';
import { Home, Castle } from 'lucide-react';
import { PHASES, STAGES } from '../game/constants';

const SETTLEMENT_ICON_SIZE = 5;
const CITY_ICON_SIZE = 6;

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

      // 2. Toast Rewards
      const rewards = G.lastRollRewards;
      if (rewards && Object.keys(rewards).length > 0) {
          toast.custom((t) => (
              <ProductionToast G={G} sum={sum} visible={t.visible} />
          ), { id: 'production-roll-toast', duration: 4000, position: 'top-center' });
      }

  }, [G.lastRoll]);

  const viewBox = useResponsiveViewBox();
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

        const allScores = getAllSettlementScores(G, ctx.currentPlayer);
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
            render={({ content }) => {
                if (!content) return null;
                const rec = JSON.parse(content) as CoachRecommendation;
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
        viewBox={viewBox}
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
                onClick={() => {}}
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
      gameControls={
        <GameControls
          G={G}
          ctx={ctx}
          moves={moves as unknown as GameControlsProps['moves']}
          buildMode={buildMode}
          setBuildMode={setBuildMode}
          uiMode={uiMode}
          setUiMode={setUiMode}
          variant={'docked'}
        />
      }
      dashboard={
        <AnalystPanel
          stats={G.boardStats}
          G={G}
          onRegenerate={() => moves.regenerateBoard()}
          showRegenerate={ctx.phase === 'setup'}
          showCoachMode={showCoachMode}
          setShowCoachMode={setShowCoachMode}
        />
      }
    />
  );
};

interface BuildingIconProps {
    vertex: { type: 'settlement' | 'city'; owner: string };
    corner: { x: number; y: number };
    ownerColor: string | null | undefined;
}

const BuildingIcon: React.FC<BuildingIconProps> = ({ vertex, corner, ownerColor }) => {
    const isSettlement = vertex.type === 'settlement';
    const Icon = isSettlement ? Home : Castle;
    const size = isSettlement ? SETTLEMENT_ICON_SIZE : CITY_ICON_SIZE;
    const typeName = isSettlement ? 'settlement' : 'city';

    return (
        <Icon
            x={corner.x - size / 2}
            y={corner.y - size / 2}
            width={size}
            height={size}
            fill={ownerColor || 'none'}
            stroke="black"
            strokeWidth={1}
            data-testid={`${typeName}-icon`}
            aria-label={`${typeName.charAt(0).toUpperCase() + typeName.slice(1)} owned by Player ${Number(vertex.owner) + 1}`}
            role="img"
        />
    );
};

const HexOverlays = ({
    hex, G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, showCoachMode, coachData
}: {
    hex: Hex,
    G: GameState,
    ctx: BoardProps<GameState>['ctx'],
    moves: BoardProps<GameState>['moves'],
    buildMode: BuildMode,
    setBuildMode: (mode: BuildMode) => void,
    uiMode: UiMode,
    setUiMode: (mode: UiMode) => void,
    showCoachMode: boolean,
    coachData: CoachData
}) => {
    // Unpack pre-calculated coach data from parent
    const { recommendations, minScore, maxScore, top3Set } = coachData;

    const isTooClose = (vertexId: string) => {
        const occupied = Object.keys(G.board.vertices);
        const thisV = vertexId.split('::');

        for (const occId of occupied) {
            const thatV = occId.split('::');
            let matchCount = 0;
            for(const h1 of thisV) {
                if(thatV.includes(h1)) matchCount++;
            }
            if (matchCount >= 2) return true;
        }
        return false;
    };

    const size = 8;
    // Use the centralized geometry
    const corners = Array.from({ length: 6 }, (_, i) => hexCornerOffset(i, size));

    const vertices = getVerticesForHex(hex.coords);
    const edges = getEdgesForHex(hex.coords);

    const getPrimaryHexOwner = (id: string): string => {
        const potentialOwners = id.split('::');
        // Fix: Find the first hex ID in the key that actually exists on the board.
        // This prevents "off-board" hexes (which don't exist in G.board.hexes) from being assigned ownership,
        // which would cause the element to not render at all.
        return potentialOwners.find(ownerId => G.board.hexes[ownerId]) || potentialOwners[0];
    };

    return (
        <Hexagon q={hex.coords.q} r={hex.coords.r} s={hex.coords.s} cellStyle={{ fill: 'none', stroke: 'none' }}>
            {/* VERTICES */}
            {corners.map((corner, i) => {
                const vId = vertices[i];
                const primaryHex = getPrimaryHexOwner(vId);

                if (primaryHex !== `${hex.coords.q},${hex.coords.r},${hex.coords.s}`) return null;

                const vertex = G.board.vertices[vId];
                const isOccupied = !!vertex;
                const ownerColor = isOccupied ? G.players[vertex.owner]?.color : null;

                // Interaction Logic
                const isSetup = ctx.phase === PHASES.SETUP;
                // Interaction logic mostly for action phase, but checking phase generically
                const isGameplay = ctx.phase === PHASES.GAMEPLAY;
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];

                const isActingStage = isGameplay && currentStage === STAGES.ACTING;

                let isClickable = false;
                let isGhost = false;
                let isRecommended = false;
                let recommendationData: CoachRecommendation | undefined;
                let heatmapColor = "";
                let isTop3 = false;
                let clickAction = () => {};

                const applyCoachRecommendation = () => {
                    const rec = recommendations[vId];
                    if (rec) {
                        isRecommended = true;
                        recommendationData = rec;
                        heatmapColor = getHeatmapColor(rec.score, minScore, maxScore);
                        if (top3Set.has(vId)) {
                            isTop3 = true;
                        }
                    }
                };

                if (isSetup) {
                    if (currentStage === STAGES.PLACE_SETTLEMENT && !isOccupied && !isTooClose(vId)) {
                        // Only activate ghost if uiMode is placing
                        if (uiMode === 'placing') {
                            isClickable = true;
                            isGhost = true;
                            clickAction = () => {
                                safeMove(() => moves.placeSettlement(vId));
                            };
                            applyCoachRecommendation();
                        }
                    }
                } else if (isActingStage) {
                    if (buildMode === 'settlement' && !isOccupied && !isTooClose(vId)) {
                        // Strict connectivity check for settlements
                        const adjEdges = getEdgesForVertex(vId);
                        const hasOwnRoad = adjEdges.some(eId => {
                            const edge = G.board.edges[eId];
                            return edge && edge.owner === ctx.currentPlayer;
                        });

                        if (hasOwnRoad) {
                            isClickable = true;
                            isGhost = true;
                            clickAction = () => {
                                safeMove(() => moves.buildSettlement(vId));
                                setBuildMode(null);
                            }
                            applyCoachRecommendation();
                        }
                    } else if (buildMode === 'city' && isOccupied && vertex.owner === ctx.currentPlayer && vertex.type === 'settlement') {
                        isClickable = true;
                        isGhost = false; // It's upgrading an existing one
                        clickAction = () => {
                             safeMove(() => moves.buildCity(vId));
                             setBuildMode(null);
                        }
                    }
                }

                return (
                    <g key={i} className="group" onClick={(e) => {
                        e.stopPropagation();
                        if (isClickable) clickAction();
                    }}>
                        <circle
                            cx={corner.x} cy={corner.y}
                            r={3}
                            fill="transparent"
                            style={{ cursor: isClickable ? 'pointer' : 'default' }}
                            data-testid={isGhost ? "ghost-vertex" : undefined}
                        />
                        {isOccupied && (
                            <BuildingIcon
                                vertex={vertex}
                                corner={corner}
                                ownerColor={ownerColor}
                            />
                        )}

                        {/* Ghost Vertex (White Dot for Click Target) */}
                        {isGhost && (
                            <circle cx={corner.x} cy={corner.y} r={BOARD_CONFIG.GHOST_VERTEX_RADIUS} fill="white" opacity={0.5} className="ghost-vertex" />
                        )}

                         {/* Highlight upgrade target */}
                        {isClickable && buildMode === 'city' && (
                             <circle cx={corner.x} cy={corner.y} r={4} fill="none" stroke="white" strokeWidth={1} className="animate-pulse" />
                        )}

                        {/* Heatmap Overlay */}
                        {isRecommended && (
                             <g
                                className={`coach-highlight transition-opacity duration-200 ${
                                    isTop3 || showCoachMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                data-tooltip-id="coach-tooltip"
                                data-tooltip-content={recommendationData ? JSON.stringify(recommendationData) : ""}
                             >
                                {/* Base Heatmap Circle */}
                                <circle
                                    cx={corner.x} cy={corner.y}
                                    r={4}
                                    fill={heatmapColor}
                                    opacity={0.6}
                                    stroke="none"
                                />

                                {/* Top 3 Highlight (Gold Ring) */}
                                {isTop3 && (
                                    <circle
                                        cx={corner.x}
                                        cy={corner.y}
                                        r={5}
                                        fill="none"
                                        stroke="#FFD700"
                                        strokeWidth={2}
                                        className="animate-pulse"
                                    />
                                )}

                                {/* Subtle ring for all recommendations */}
                                {!isTop3 && (
                                    <circle
                                        cx={corner.x} cy={corner.y}
                                        r={4}
                                        fill="none"
                                        stroke={heatmapColor}
                                        strokeWidth={0.5}
                                    />
                                )}
                             </g>
                        )}
                    </g>
                );
            })}

            {/* EDGES */}
            {corners.map((corner, i) => {
                const eId = edges[i];
                const primaryHex = getPrimaryHexOwner(eId);

                if (primaryHex !== `${hex.coords.q},${hex.coords.r},${hex.coords.s}`) return null;

                const nextCorner = corners[(i + 1) % 6];
                const midX = (corner.x + nextCorner.x) / 2;
                const midY = (corner.y + nextCorner.y) / 2;

                const edge = G.board.edges[eId];
                const isOccupied = !!edge;
                const ownerColor = isOccupied ? G.players[edge.owner]?.color : null;
                const angle = Math.atan2(nextCorner.y - corner.y, nextCorner.x - corner.x) * 180 / Math.PI;

                // Interaction Logic
                const isSetup = ctx.phase === PHASES.SETUP;
                const isGameplay = ctx.phase === PHASES.GAMEPLAY;
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];

                const isActingStage = isGameplay && currentStage === STAGES.ACTING;


                let isClickable = false;
                let isGhost = false;
                let clickAction = () => {};

                if (isSetup) {
                     if (currentStage === STAGES.PLACE_ROAD && !isOccupied) {
                         // Only activate ghost if uiMode is placing
                        if (uiMode === 'placing') {
                            const isConnected = G.setupPhase.activeSettlement && getEdgesForVertex(G.setupPhase.activeSettlement).includes(eId);
                            if (isConnected) {
                                isClickable = true;
                                isGhost = true;
                                clickAction = () => {
                                    safeMove(() => moves.placeRoad(eId));
                                    setUiMode('viewing');
                                };
                            }
                        }
                     }
                } else if (isActingStage) {
                    if (buildMode === 'road' && !isOccupied) {
                         const endpoints = getVerticesForEdge(eId);

                         const hasConnection = (vId: string): boolean => {
                            const building = G.board.vertices[vId];
                            // Connected to own settlement/city
                            if (building && building.owner === ctx.currentPlayer) return true;
                            // Blocked by opponent's settlement/city
                            if (building && building.owner !== ctx.currentPlayer) return false;
                            // Connected to own road
                            const adjEdges = getEdgesForVertex(vId);
                            return adjEdges.some(adjEdgeId => {
                                if (adjEdgeId === eId) return false;
                                const edge = G.board.edges[adjEdgeId];
                                return edge && edge.owner === ctx.currentPlayer;
                            });
                        };

                        if (endpoints.some(hasConnection)) {
                            isClickable = true;
                            isGhost = true;
                            clickAction = () => {
                                safeMove(() => moves.buildRoad(eId));
                                setBuildMode(null);
                            }
                        }
                    }
                }

                return (
                     <g key={`edge-${i}`} onClick={(e) => {
                        e.stopPropagation();
                        if (isClickable) clickAction();
                    }}>
                        <circle cx={midX} cy={midY} r={2.5} fill="transparent" style={{ cursor: isClickable ? 'pointer' : 'default' }} />
                        {isOccupied && (
                            <rect
                                x={midX - 3} y={midY - 1}
                                width={6} height={2}
                                fill={ownerColor || 'none'}
                                transform={`rotate(${angle} ${midX} ${midY})`}
                            />
                        )}
                         {isGhost && (
                            <rect
                                x={midX - 3} y={midY - 1}
                                width={6} height={2}
                                fill="white" opacity={0.5}
                                transform={`rotate(${angle} ${midX} ${midY})`}
                                data-testid="ghost-edge"
                            />
                        )}
                    </g>
                );
            })}
        </Hexagon>
    );
}
