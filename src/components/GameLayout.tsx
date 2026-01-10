import React, { useState } from 'react';
import {
    Z_INDEX_BOARD,
    Z_INDEX_TOOLTIP,
    Z_INDEX_GAME_CONTROLS_CONTAINER,
    Z_INDEX_FLOATING_UI
} from '../styles/z-indices';
import { BarChart2, Bot } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useIsMobile } from '../hooks/useIsMobile';
import { Resources } from '../game/types';
import { RESOURCE_META } from './uiConfig';
import { AnalystShell } from './AnalystShell';
import { CoachShell } from './CoachShell';
import { CoachPanel } from './CoachPanel';
import { DiceIcons } from './DiceIcons';

interface GameLayoutProps {
  board: React.ReactNode;
  dashboard: React.ReactNode;
  playerPanel: React.ReactNode;
  gameControls: React.ReactNode;
  gameStatus?: React.ReactNode;
}

const renderCostTooltip = ({ content }: { content: string | null }) => {
  if (!content) return null;

  try {
    const cost = JSON.parse(content) as Partial<Resources>;
    const hasCost = Object.values(cost).some((val) => val && val > 0);

    if (!hasCost) return null;

    return (
      <div className="flex gap-2">
        {RESOURCE_META.map(({ name, Icon, color }) => {
          const amount = cost[name];
          if (!amount) return null;
          return (
            <span key={name} className="flex items-center gap-1">
              <Icon className={color} size={16} />
              {amount}
            </span>
          );
        })}
      </div>
    );
  } catch (error) {
    console.error('Failed to parse tooltip content:', error);
    return null;
  }
};

const renderDiceTooltip = ({ content }: { content: string | null }) => {
    if (!content) return null;

    try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed.d1 === 'number' && typeof parsed.d2 === 'number') {
            return <DiceIcons d1={parsed.d1} d2={parsed.d2} size={24} className="text-white" />;
        }
        return null;
    } catch (error) {
        console.error('Failed to parse dice tooltip content:', error);
        return null;
    }
};

export const GameLayout: React.FC<GameLayoutProps> = ({ board, dashboard, playerPanel, gameControls, gameStatus }) => {
  const isMobile = useIsMobile();

  // 'analyst' | 'coach' | null
  // Default to 'analyst' on desktop, null on mobile
  const [activePanel, setActivePanel] = useState<'analyst' | 'coach' | null>(!isMobile ? 'analyst' : null);

  const toggleAnalyst = () => {
    setActivePanel(prev => prev === 'analyst' ? null : 'analyst');
  };

  const toggleCoach = () => {
    setActivePanel(prev => prev === 'coach' ? null : 'coach');
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
        onClick={toggleAnalyst}
        aria-label="Toggle Analyst Dashboard"
        aria-expanded={activePanel === 'analyst'}
        aria-controls="analyst-dashboard"
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
        onClick={toggleCoach}
        aria-label="Toggle Coach Bot"
        aria-expanded={activePanel === 'coach'}
        aria-controls="coach-bot-panel"
    >
        <Bot size={24} />
    </button>
  ) : null;

  return (
    <div
      data-testid="game-layout"
      className="relative w-full h-[100dvh] md:h-screen overflow-hidden bg-slate-900 text-slate-100 flex flex-col md:flex-row"
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

      {/* 2. Analyst Panel (Left Sidebar on Desktop, Top Drawer on Mobile) */}
      <AnalystShell isOpen={activePanel === 'analyst'} onToggle={toggleAnalyst}>
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
      <CoachShell isOpen={activePanel === 'coach'} onToggle={toggleCoach}>
          <CoachPanel />
      </CoachShell>

      {/* 1. Toggle Buttons (Rendered last to ensure z-index priority) */}
      {AnalystToggle}
      {CoachToggle}

    </div>
  );
};
