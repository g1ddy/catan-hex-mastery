import React, { useRef, useCallback } from 'react';
import { BoardProps } from 'boardgame.io/react';
import { GameState, ClientMoves } from '../../../game/core/types';
import { BuildMode, UiMode } from '../../shared/types';
import { getHeatmapColor, CoachRecommendation } from '../../../game/analysis/coach';
import { safeMove } from '../../shared/utils/feedback';
import { safeGet } from '../../../game/core/utils/objectUtils';
import { PHASES, STAGES } from '../../../game/core/constants';
import { OverlayVertex } from './OverlayVertex';
import { getPrimaryHexOwner } from './helpers';

export interface CoachData {
    recommendations: Map<string, CoachRecommendation>;
    minScore: number;
    maxScore: number;
    top3Set: Set<string>;
}

function checkGameplayState(isActingStage: boolean, buildMode: BuildMode, validSettlements: Set<string>, validCities: Set<string>, vId: string) {
    if (!isActingStage) return { isClickable: false, isGhost: false };
    if (buildMode === 'settlement' && validSettlements.has(vId)) return { isClickable: true, isGhost: true };
    if (buildMode === 'city' && validCities.has(vId)) return { isClickable: true, isGhost: false };
    return { isClickable: false, isGhost: false };
}

function getVertexInteractiveState(
    vId: string,
    isSetup: boolean,
    isActingStage: boolean,
    currentStage: string | undefined,
    uiMode: UiMode,
    buildMode: BuildMode,
    validSettlements: Set<string>,
    validCities: Set<string>,
    coachData: CoachData
) {
    let isClickable = false;
    let isGhost = false;
    let recommendationData: CoachRecommendation | undefined;
    let heatmapColor: string | undefined;
    let isTop3 = false;

    const isSetupMode = isSetup && currentStage === STAGES.PLACE_SETTLEMENT && uiMode === 'placing' && validSettlements.has(vId);

    if (isSetupMode) {
        isClickable = true;
        isGhost = true;
    } else {
        const gameplayState = checkGameplayState(isActingStage, buildMode, validSettlements, validCities, vId);
        isClickable = gameplayState.isClickable;
        isGhost = gameplayState.isGhost;
    }

    if (isClickable) {
        const rec = coachData.recommendations.get(vId);
        if (rec) {
            recommendationData = rec;
            heatmapColor = getHeatmapColor(rec.score, coachData.minScore, coachData.maxScore);
            isTop3 = coachData.top3Set.has(vId);
        }
    }

    return { isClickable, isGhost, recommendationData, heatmapColor, isTop3 };
}

interface HexVerticesProps {
    vertices: { id: string; parts: string[]; x: number; y: number }[];
    G: GameState;
    ctx: BoardProps<GameState>['ctx'];
    moves: ClientMoves;
    buildMode: BuildMode;
    setBuildMode: (mode: BuildMode) => void;
    uiMode: UiMode;
    validSettlements: Set<string>;
    validCities: Set<string>;
    coachData: CoachData;
    showResourceHeatmap: boolean;
    currentHexIdStr: string;
}

export const HexVertices: React.FC<HexVerticesProps> = ({
    vertices, G, ctx, moves, buildMode, setBuildMode, uiMode,
    validSettlements, validCities, coachData, showResourceHeatmap, currentHexIdStr
}) => {
    // Stable handler setup
    const stateRef = useRef({ G, ctx, moves, buildMode, setBuildMode, uiMode, validSettlements, validCities });
    stateRef.current = { G, ctx, moves, buildMode, setBuildMode, uiMode, validSettlements, validCities };

    const handleVertexClick = useCallback((vId: string) => {
        const { ctx, moves, buildMode, setBuildMode } = stateRef.current;
        const isSetup = ctx.phase === PHASES.SETUP;

        if (isSetup) {
            safeMove(() => moves.placeSettlement(vId));
        } else {
            if (buildMode === 'settlement') {
                safeMove(() => moves.buildSettlement(vId));
                setBuildMode(null);
            } else if (buildMode === 'city') {
                safeMove(() => moves.buildCity(vId));
                setBuildMode(null);
            }
        }
    }, []);

    return (
        <>
            {vertices.map((vData) => {
                const { id: vId, parts } = vData;
                if (getPrimaryHexOwner(parts, G) !== currentHexIdStr) return null;

                const vertex = safeGet(G.board.vertices, vId);
                const ownerColor = vertex ? G.players[vertex.owner]?.color : null;
                const isSetup = ctx.phase === PHASES.SETUP;
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];
                const isActingStage = ctx.phase === PHASES.GAMEPLAY && currentStage === STAGES.ACTING;

                const { isClickable, isGhost, recommendationData, heatmapColor, isTop3 } = getVertexInteractiveState(
                    vId, isSetup, isActingStage, currentStage, uiMode, buildMode, validSettlements, validCities, coachData
                );

                return (
                    <OverlayVertex
                        key={vId} vId={vId} cx={vData.x} cy={vData.y} vertex={vertex}
                        ownerColor={ownerColor} isClickable={isClickable} isGhost={isGhost}
                        onClick={handleVertexClick} buildMode={buildMode}
                        hasRecommendation={!!recommendationData}
                        heatmapColor={heatmapColor}
                        isTop3={isTop3}
                        showResourceHeatmap={showResourceHeatmap}
                    />
                );
            })}
        </>
    );
};
