import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HexGrid, Layout } from 'react-hexgrid';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { GameState, Hex, ClientMoves } from '../../game/core/types';
import { Ctx } from 'boardgame.io';
import { BOARD_CONFIG, BOARD_VIEWBOX } from '../../game/core/config';
import { Z_INDEX_TOOLTIP } from '../shared/constants/z-indices';
import { GameHex } from './components/GameHex';
import { HexOverlays } from './components/HexOverlays';
import { CoachData } from '../coach/hooks/useCoachData';
import { useGameEffects } from './hooks/useGameEffects';
import { useBoardInteractions } from './hooks/useBoardInteractions';
import { BuildMode, UiMode } from '../shared/types';
import { renderTooltipContent } from './components/helpers';

interface BoardLayerProps {
    G: GameState;
    ctx: Ctx;
    moves: ClientMoves;
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
    const { validSettlements, validCities, validRoads } = useBoardInteractions(G, ctx, ctx.currentPlayer);
    const renderCoachTooltip = useCallback(renderTooltipContent(coachData), [coachData]);

    return (
        <div className="board absolute inset-0 overflow-hidden">
            {createPortal(
                <Tooltip
                    id="coach-tooltip"
                    place="top"
                    className="coach-tooltip"
                    style={{ zIndex: Z_INDEX_TOOLTIP }}
                    render={renderCoachTooltip}
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
                                validSettlements={validSettlements}
                                validCities={validCities}
                                validRoads={validRoads}
                            />
                        ))}
                    </g>
                </Layout>
            </HexGrid>
        </div>
    );
};
