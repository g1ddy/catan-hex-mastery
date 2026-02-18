import React from 'react';
import {
    Z_INDEX_BOARD,
    Z_INDEX_TOOLTIP,
    Z_INDEX_GAME_CONTROLS_CONTAINER,
    Z_INDEX_FLOATING_UI
} from '../shared/constants/z-indices';
import { BarChart2, Bot } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useIsMobile } from '../shared/hooks/useIsMobile';
import { useViewportDvh } from './hooks/useViewportDvh';
import { UI_LABELS } from '../shared/constants/labels';
import { AnalystShell } from '../coach/components/AnalystShell';
import { CoachShell } from '../coach/components/CoachShell';
import { renderCostTooltip, renderDiceTooltip, renderTradeTooltip } from './components/TooltipRenderers';

interface GameLayoutProps {
  board: React.ReactNode;
  dashboard: React.ReactNode;
  playerPanel: React.ReactNode;
  gameControls: React.ReactNode;
  gameStatus?: React.ReactNode;
  gameNotification?: React.ReactNode;
  coachPanel: React.ReactNode;
  activePanel: 'analyst' | 'coach' | null;
  onPanelChange: (panel: 'analyst' | 'coach' | null) => void;
}

export const GameLayout: React.FC<GameLayoutProps> = ({
  board,
  dashboard,
  playerPanel,
  gameControls,
  gameStatus,
  gameNotification,
  coachPanel,
  activePanel,
  onPanelChange
}) => {
  const isMobile = useIsMobile();

  const togglePanel = (panel: 'analyst' | 'coach') => {
    onPanelChange(activePanel === panel ? null : panel);
  };

  // Toggle buttons visibility (Only visible when their respective panel is closed on Desktop)
  // On Mobile, panels are drawers, so buttons act as main triggers always.
  const showAnalystToggle = isMobile || activePanel !== 'analyst';
  const showCoachToggle = isMobile || activePanel !== 'coach';

  const AnalystToggle = showAnalystToggle ? (
    <button
        className={`
            fixed top-4 left-4
            p-3 rounded-xl bg-slate-900/90 backdrop-blur-md text-slate-300
            hover:text-white hover:bg-slate-700 transition-all active:scale-95
            border border-slate-700 shadow-lg
        `}
        style={{ zIndex: Z_INDEX_FLOATING_UI }}
        onClick={() => togglePanel('analyst')}
        aria-label={`Toggle ${UI_LABELS.ANALYST_DASHBOARD}`}
        aria-expanded={activePanel === 'analyst'}
        aria-controls="analyst-dashboard"
        data-tooltip-id="ui-tooltip"
        data-tooltip-content={UI_LABELS.ANALYST_DASHBOARD}
    >
        <BarChart2 size={24} />
    </button>
  ) : null;

  const CoachToggle = showCoachToggle ? (
    <button
        className={`
            fixed top-4 right-4
            p-3 rounded-xl bg-slate-900/90 backdrop-blur-md text-slate-300
            hover:text-white hover:bg-slate-700 transition-all active:scale-95
            border border-slate-700 shadow-lg
        `}
        style={{ zIndex: Z_INDEX_FLOATING_UI }}
        onClick={() => togglePanel('coach')}
        aria-label={`Toggle ${UI_LABELS.COACH_BOT}`}
        aria-expanded={activePanel === 'coach'}
        aria-controls="coach-bot-panel"
        data-tooltip-id="ui-tooltip"
        data-tooltip-content={UI_LABELS.COACH_BOT}
    >
        <Bot size={24} />
    </button>
  ) : null;

  // Use JS-calculated height to handle inconsistent vh/dvh across mobile/tablet browsers
  const viewportHeight = useViewportDvh();

  return (
    <div
      data-testid="game-layout"
      className="relative w-full overflow-hidden bg-slate-900 text-slate-100 flex flex-col md:flex-row"
      style={{ height: viewportHeight }}
    >
      <Toaster />
      <Tooltip id="resource-tooltip" place="top" style={{ zIndex: Z_INDEX_TOOLTIP }} />
      <Tooltip
          id="cost-tooltip"
          place="top"
          style={{ zIndex: Z_INDEX_TOOLTIP }}
          render={renderCostTooltip}
      />
      <Tooltip
          id="dice-tooltip"
          place="top"
          style={{ zIndex: Z_INDEX_TOOLTIP }}
          render={renderDiceTooltip}
      />
      <Tooltip
          id="trade-tooltip"
          place="top"
          style={{ zIndex: Z_INDEX_TOOLTIP }}
          render={renderTradeTooltip}
      />
      <Tooltip
          id="ui-tooltip"
          place="bottom"
          style={{ zIndex: Z_INDEX_TOOLTIP }}
      />

      {/* 2. Analyst Panel (Left Sidebar on Desktop, Top Drawer on Mobile) */}
      <AnalystShell isOpen={activePanel === 'analyst'} onToggle={() => togglePanel('analyst')}>
          {dashboard}
      </AnalystShell>

      {/* 3. Main Content Area */}
      <main className="flex-grow flex flex-col h-full relative overflow-hidden">

          {/* Top Section: Game Status Banner */}
          {gameStatus && (
              <div
                  className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none"
                  style={{ zIndex: Z_INDEX_FLOATING_UI + 10 }} // Ensure it's above everything
              >
                  {gameStatus}
              </div>
          )}

          {/* Notifications (Toast) */}
          {gameNotification && (
              <div
                  className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none"
                  style={{ zIndex: Z_INDEX_FLOATING_UI + 20 }} // Above status banner
              >
                  {gameNotification}
              </div>
          )}

          {/* Middle Section: Board + Player Panel */}
          <div className="flex-grow flex flex-col relative overflow-hidden">

              {/* Board Area */}
              <div className="flex-grow relative w-full">
                   {/* Board Background Layer */}
                   <div
                      className="absolute inset-0"
                      style={{ zIndex: Z_INDEX_BOARD }}
                   >
                        {board}
                   </div>
              </div>

              {/* Player Panel Area */}
              <div
                  className="
                    flex-shrink-0 p-2
                    md:absolute md:bottom-4 md:right-4 md:p-0
                    md:w-auto md:bg-transparent
                  "
                  style={{ zIndex: Z_INDEX_FLOATING_UI }}
              >
                   {playerPanel}
              </div>
          </div>

          {/* Bottom Section: Game Controls */}
          <div
            className={`
              flex-shrink-0
              p-2 pb-6 md:p-4 md:pb-6
              flex justify-center
            `}
            style={{ zIndex: Z_INDEX_GAME_CONTROLS_CONTAINER }}
          >
              <div className="w-full max-w-4xl">
                 {gameControls}
              </div>
          </div>
      </main>

      {/* 4. Coach Panel (Right Sidebar on Desktop, Top Drawer on Mobile) */}
      <CoachShell isOpen={activePanel === 'coach'} onToggle={() => togglePanel('coach')}>
          {coachPanel}
      </CoachShell>

      {/* 1. Toggle Buttons (Rendered last to ensure z-index priority) */}
      {AnalystToggle}
      {CoachToggle}

    </div>
  );
};
