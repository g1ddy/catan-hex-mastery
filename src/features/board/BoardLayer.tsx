import React from 'react';
import { createPortal } from 'react-dom';
import { HexGrid, Layout } from 'react-hexgrid';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { GameState, Hex } from '../../game/core/types';
import { Ctx } from 'boardgame.io';
import { BOARD_CONFIG, BOARD_VIEWBOX } from '../../game/core/config';
import { Z_INDEX_TOOLTIP } from '../../styles/z-indices';
import { GameHex } from './components/GameHex';
import { HexOverlays } from './components/HexOverlays';
import { CoachData } from '../coach/hooks/useCoachData';
import { useGameEffects } from './hooks/useGameEffects';
import { BuildMode, UiMode } from '../hud/components/GameControls';

interface BoardLayerProps {
    G: GameState;
    ctx: Ctx;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    moves: any;
    coachData: CoachData;
    buildMode: BuildMode;
    setBuildMode: (mode: BuildMode) => void;
    uiMode: UiMode;
    setUiMode: (mode: UiMode) => void;
    showResourceHeatmap: boolean;
    highlightedPortEdgeId: string | undefined;
    pendingRobberHex: string | null;
    onHexClick: (hex: Hex) => void;
}

export const BoardLayer: React.FC<BoardLayerProps> = ({
    G,
    ctx,
    moves,
    coachData,
    buildMode,
    setBuildMode,
    uiMode,
    setUiMode,
    showResourceHeatmap,
    highlightedPortEdgeId,
    pendingRobberHex,
    onHexClick
}) => {
    const hexes = Object.values(G.board.hexes);
    const { producingHexIds } = useGameEffects(G);

    return (
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
                        {hexes.map((hex: Hex) => (
                            <GameHex
                                key={hex.id}
                                hex={hex}
                                onClick={onHexClick}
                                isProducing={producingHexIds.includes(hex.id)}
                                hasRobber={G.robberLocation === hex.id && pendingRobberHex === null}
                                isPendingRobber={pendingRobberHex === hex.id}
                            />
                        ))}
                    </g>
                    <g>
                        {hexes.map((hex: Hex) => (
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
};
