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

function checkBasicPropsEqual(prev: HexOverlaysProps, next: HexOverlaysProps): boolean {
    if (prev.hex.id !== next.hex.id) return false;

    if (prev.buildMode !== next.buildMode ||
        prev.uiMode !== next.uiMode ||
        prev.showResourceHeatmap !== next.showResourceHeatmap ||
        prev.highlightedPortEdgeId !== next.highlightedPortEdgeId ||
        prev.ctx.phase !== next.ctx.phase ||
        prev.ctx.currentPlayer !== next.ctx.currentPlayer ||
        prev.ctx.activePlayers?.[prev.ctx.currentPlayer] !== next.ctx.activePlayers?.[next.ctx.currentPlayer]) {
        return false;
    }

    if (prev.coachData !== next.coachData) {
        if (prev.coachData?.minScore !== next.coachData?.minScore ||
            prev.coachData?.maxScore !== next.coachData?.maxScore) {
            return false;
        }
    }

    return true;
}

function checkVerticesEqual(prev: HexOverlaysProps, next: HexOverlaysProps, vertices: { id: string }[]): boolean {
    for (const v of vertices) {
        if (safeGet(prev.G.board.vertices, v.id)?.owner !== safeGet(next.G.board.vertices, v.id)?.owner) return false;
        if (prev.validSettlements.has(v.id) !== next.validSettlements.has(v.id)) return false;
        if (prev.validCities.has(v.id) !== next.validCities.has(v.id)) return false;

        if (prev.coachData !== next.coachData) {
            if (prev.coachData?.top3Set.has(v.id) !== next.coachData?.top3Set.has(v.id)) return false;
            if (prev.coachData?.recommendations.get(v.id)?.score !== next.coachData?.recommendations.get(v.id)?.score) return false;
        }
    }
    return true;
}

function checkEdgesEqual(prev: HexOverlaysProps, next: HexOverlaysProps, edges: { id: string }[]): boolean {
    for (const e of edges) {
        if (safeGet(prev.G.board.edges, e.id)?.owner !== safeGet(next.G.board.edges, e.id)?.owner) return false;

        const port = safeGet(prev.G.board.ports, e.id);
        if (port) {
            for (const vId of port.vertices) {
                if (safeGet(prev.G.board.vertices, vId)?.owner !== safeGet(next.G.board.vertices, vId)?.owner) return false;
            }
        }

        if (prev.validRoads.has(e.id) !== next.validRoads.has(e.id)) return false;

        if (prev.coachData !== next.coachData) {
            if (prev.coachData?.top3Set.has(e.id) !== next.coachData?.top3Set.has(e.id)) return false;
            if (prev.coachData?.recommendations.get(e.id)?.score !== next.coachData?.recommendations.get(e.id)?.score) return false;
        }
    }
    return true;
}

// Custom memoization to prevent re-renders when board state changes unnecessarily
function arePropsEqual(prev: HexOverlaysProps, next: HexOverlaysProps) {
    if (!checkBasicPropsEqual(prev, next)) return false;

    // This is the key: only re-render if the relevant parts of the board have changed for this hex
    const { vertices: prevV, edges: prevE } = getHexGeometry(prev.hex);

    if (!checkVerticesEqual(prev, next, prevV)) return false;
    if (!checkEdgesEqual(prev, next, prevE)) return false;

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
