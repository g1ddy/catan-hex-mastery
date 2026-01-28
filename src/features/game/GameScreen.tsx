import React from 'react';
import { BoardProps } from 'boardgame.io/react';
import { GameState, ClientMoves } from '../../game/core/types';
import { GameLayout } from './GameLayout';
import { Coach, StrategicAdvice } from '../../game/analysis/coach';
import { useTradeLogic } from '../hud/hooks/useTradeLogic';
import { useCoachData } from '../coach/hooks/useCoachData';
import { GAME_MESSAGES } from './constants';
import { useGameScreenState } from './hooks/useGameScreenState';

// Feature Layers
import { BoardLayer } from '../board/BoardLayer';
import { HUDLayer } from '../hud/HUDLayer';
import { CoachLayer } from '../coach/CoachLayer';

export interface GameScreenProps extends BoardProps<GameState> {
  onPlayerChange?: (playerID: string) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ G, ctx, moves, playerID, onPlayerChange }) => {
    // 1. Core State & Logic (Extracted)
    const {
        showResourceHeatmap,
        setShowResourceHeatmap,
        isCoachModeEnabled,
        handleSetCoachModeEnabled,
        customBannerMessage,
        setCustomBannerMessage,
        handleCustomMessageClear,
        pendingRobberHex,
        activePanel,
        setActivePanel,
        buildMode,
        setBuildMode,
        uiMode,
        setUiMode,
        handleHexClick,
        canRegenerateBoard
    } = useGameScreenState(G, ctx, playerID, onPlayerChange);

    // 2. Derived State (Coach Advice)
    const strategicAdvice: StrategicAdvice | null = React.useMemo(() => {
        if (!isCoachModeEnabled) return null;
        const coach = new Coach(G);
        return coach.getStrategicAdvice(ctx.currentPlayer, ctx);
    }, [G, ctx, isCoachModeEnabled]);

    // 3. Derived State (Coach Visuals)
    const coachData = useCoachData(G, ctx, buildMode, uiMode, isCoachModeEnabled);

    // 4. Derived State (Trade Highlighting)
    const { highlightedPortEdgeId } = useTradeLogic(G, ctx);

    return (
        <GameLayout
            board={
                <BoardLayer
                    G={G}
                    ctx={ctx}
                    moves={moves as unknown as ClientMoves}
                    coachData={coachData}
                    buildMode={buildMode}
                    setBuildMode={setBuildMode}
                    uiMode={uiMode}
                    setUiMode={setUiMode}
                    showResourceHeatmap={showResourceHeatmap}
                    highlightedPortEdgeId={highlightedPortEdgeId}
                    pendingRobberHex={pendingRobberHex}
                    onHexClick={handleHexClick}
                />
            }
            playerPanel={
                <HUDLayer.PlayerPanel
                    players={G.players}
                    currentPlayerId={ctx.currentPlayer}
                />
            }
            gameStatus={
                <HUDLayer.Banner
                    ctx={ctx}
                    playerID={playerID}
                    uiMode={uiMode}
                    buildMode={buildMode}
                    customMessage={customBannerMessage}
                    onCustomMessageClear={handleCustomMessageClear}
                />
            }
            gameNotification={<HUDLayer.Notification G={G} />}
            gameControls={
                <HUDLayer.Controls
                    G={G}
                    ctx={ctx}
                    moves={moves as unknown as ClientMoves}
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
                <CoachLayer.Analyst
                    stats={G.boardStats}
                    G={G}
                    onRegenerate={() => {
                        moves.regenerateBoard();
                        setCustomBannerMessage({ text: GAME_MESSAGES.BOARD_REGENERATED, type: 'success' });
                    }}
                    canRegenerate={canRegenerateBoard}
                />
            }
            coachPanel={
                <CoachLayer.Coach
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
