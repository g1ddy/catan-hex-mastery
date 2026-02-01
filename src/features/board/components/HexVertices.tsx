import React from 'react';
import { BoardProps } from 'boardgame.io/react';
import { GameState, ClientMoves } from '../../../game/core/types';
import { BuildMode, UiMode } from '../../shared/types';
import { getHeatmapColor, CoachRecommendation } from '../../../game/analysis/coach';
import { safeMove } from '../../shared/utils/feedback';
import { safeGet, safeCheck } from '../../../game/core/utils/objectUtils';
import { PHASES, STAGES } from '../../../game/core/constants';
import { OverlayVertex } from './OverlayVertex';

export interface CoachData {
    recommendations: Map<string, CoachRecommendation>;
    minScore: number;
    maxScore: number;
    top3Set: Set<string>;
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

    const getPrimaryHexOwner = (parts: string[]): string => {
        return parts.find(ownerId => safeCheck(G.board.hexes, ownerId)) || parts[0];
    };

    return (
        <>
            {vertices.map((vData) => {
                const { id: vId, parts } = vData;
                if (getPrimaryHexOwner(parts) !== currentHexIdStr) return null;

                const vertex = safeGet(G.board.vertices, vId);
                const ownerColor = vertex ? G.players[vertex.owner]?.color : null;
                const isSetup = ctx.phase === PHASES.SETUP;
                const currentStage = ctx.activePlayers?.[ctx.currentPlayer];
                const isActingStage = ctx.phase === PHASES.GAMEPLAY && currentStage === STAGES.ACTING;

                let isClickable = false;
                let isGhost = false;
                let recommendationData: CoachRecommendation | undefined;
                let heatmapColor = "";
                let isTop3 = false;
                let clickAction = () => {};

                const applyCoachRec = () => {
                    const rec = coachData.recommendations.get(vId);
                    if (rec) {
                        recommendationData = rec;
                        heatmapColor = getHeatmapColor(rec.score, coachData.minScore, coachData.maxScore);
                        isTop3 = coachData.top3Set.has(vId);
                    }
                };

                if (isSetup && currentStage === STAGES.PLACE_SETTLEMENT && uiMode === 'placing' && validSettlements.has(vId)) {
                    isClickable = true;
                    isGhost = true;
                    clickAction = () => safeMove(() => moves.placeSettlement(vId));
                    applyCoachRec();
                } else if (isActingStage) {
                    if (buildMode === 'settlement' && validSettlements.has(vId)) {
                         isClickable = true;
                         isGhost = true;
                         clickAction = () => {
                             safeMove(() => moves.buildSettlement(vId));
                             setBuildMode(null);
                         };
                         applyCoachRec();
                    } else if (buildMode === 'city' && validCities.has(vId)) {
                         isClickable = true;
                         clickAction = () => {
                              safeMove(() => moves.buildCity(vId));
                              setBuildMode(null);
                         };
                         applyCoachRec();
                    }
                }

                return (
                    <OverlayVertex
                        key={vId} vId={vId} cx={vData.x} cy={vData.y} vertex={vertex}
                        ownerColor={ownerColor} isClickable={isClickable} isGhost={isGhost}
                        onClick={clickAction} buildMode={buildMode}
                        recommendation={recommendationData ? { heatmapColor, isTop3, data: recommendationData } : undefined}
                        showResourceHeatmap={showResourceHeatmap}
                    />
                );
            })}
        </>
    );
};
