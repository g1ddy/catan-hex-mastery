import React, { useMemo } from 'react';
import { Hexagon } from 'react-hexgrid';
import { BoardProps } from 'boardgame.io/react';
import { GameState, Hex, ClientMoves } from '../../../game/core/types';
import { getHexGeometry } from '../../../game/geometry/staticGeometry';
import { BuildMode, UiMode } from '../../shared/types';
import { CoachRecommendation } from '../../../game/analysis/coach';
import { safeGet } from '../../../game/core/utils/objectUtils';
import { HexVertices } from './HexVertices';
import { HexEdges } from './HexEdges';

export interface CoachData {
    recommendations: Map<string, CoachRecommendation>;
    minScore: number;
    maxScore: number;
    top3Set: Set<string>;
}

interface HexOverlaysProps {
    hex: Hex;
    G: GameState;
    ctx: BoardProps<GameState>['ctx'];
    moves: ClientMoves;
    buildMode: BuildMode;
    setBuildMode: (mode: BuildMode) => void;
    uiMode: UiMode;
    setUiMode: (mode: UiMode) => void;
    showResourceHeatmap: boolean;
    coachData: CoachData;
    highlightedPortEdgeId?: string;
    validSettlements: Set<string>;
    validCities: Set<string>;
    validRoads: Set<string>;
}

// Custom memoization to prevent re-renders when board state changes unnecessarily
function arePropsEqual(prev: HexOverlaysProps, next: HexOverlaysProps) {
    if (prev.hex.id !== next.hex.id) return false;

    if (prev.buildMode !== next.buildMode ||
        prev.uiMode !== next.uiMode ||
        prev.showResourceHeatmap !== next.showResourceHeatmap ||
        prev.coachData !== next.coachData ||
        prev.highlightedPortEdgeId !== next.highlightedPortEdgeId ||
        prev.ctx.phase !== next.ctx.phase ||
        prev.ctx.currentPlayer !== next.ctx.currentPlayer ||
        prev.ctx.activePlayers?.[prev.ctx.currentPlayer] !== next.ctx.activePlayers?.[next.ctx.currentPlayer]) {
        return false;
    }

    // This is the key: only re-render if the relevant parts of the board have changed for this hex
    const { vertices: prevV, edges: prevE } = getHexGeometry(prev.hex);

    for (const v of prevV) {
        if (safeGet(prev.G.board.vertices, v.id) !== safeGet(next.G.board.vertices, v.id)) return false;
        // Check if settlement/city validity changed for this vertex
        if (prev.validSettlements.has(v.id) !== next.validSettlements.has(v.id)) return false;
        if (prev.validCities.has(v.id) !== next.validCities.has(v.id)) return false;
    }
    for (const e of prevE) {
        if (safeGet(prev.G.board.edges, e.id) !== safeGet(next.G.board.edges, e.id)) return false;
        if (safeGet(prev.G.board.ports, e.id) !== safeGet(next.G.board.ports, e.id)) return false;
        // Check if road validity changed for this edge
        if (prev.validRoads.has(e.id) !== next.validRoads.has(e.id)) return false;
    }

    return true;
}

export const HexOverlays = React.memo(({
    hex, G, ctx, moves, buildMode, setBuildMode, uiMode, setUiMode, showResourceHeatmap, coachData, highlightedPortEdgeId,
    validSettlements, validCities, validRoads
}: HexOverlaysProps) => {
    const { vertices, edges, currentHexIdStr } = useMemo(() => getHexGeometry(hex), [hex]);

    return (
        <Hexagon q={hex.coords.q} r={hex.coords.r} s={hex.coords.s} cellStyle={{ fill: 'none', stroke: 'none' }}>
            <HexVertices
                vertices={vertices}
                G={G}
                ctx={ctx}
                moves={moves}
                buildMode={buildMode}
                setBuildMode={setBuildMode}
                uiMode={uiMode}
                validSettlements={validSettlements}
                validCities={validCities}
                coachData={coachData}
                showResourceHeatmap={showResourceHeatmap}
                currentHexIdStr={currentHexIdStr}
            />
            <HexEdges
                edges={edges}
                G={G}
                ctx={ctx}
                moves={moves}
                buildMode={buildMode}
                setBuildMode={setBuildMode}
                uiMode={uiMode}
                setUiMode={setUiMode}
                validRoads={validRoads}
                highlightedPortEdgeId={highlightedPortEdgeId}
                currentHexIdStr={currentHexIdStr}
                coachData={coachData}
            />
        </Hexagon>
    );
}, arePropsEqual);
