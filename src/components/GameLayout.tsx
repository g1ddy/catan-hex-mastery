import React, { useEffect, useState } from 'react';
import { BANK_TRADE_GIVE_AMOUNT, BANK_TRADE_RECEIVE_AMOUNT } from '../game/config';
import {
    Z_INDEX_BOARD,
    Z_INDEX_TOOLTIP,
    Z_INDEX_GAME_CONTROLS_CONTAINER,
    Z_INDEX_FLOATING_UI
} from '../styles/z-indices';
import { BarChart2, Bot, ArrowRight } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useIsMobile } from '../hooks/useIsMobile';
import { Resources } from '../game/types';
import { RESOURCE_META } from './uiConfig';
import { AnalystShell } from './AnalystShell';
import { CoachShell } from './CoachShell';
import { DiceIcons } from './DiceIcons';

interface GameLayoutProps {
  board: React.ReactNode;
  dashboard: React.ReactNode;
  playerPanel: React.ReactNode;
  gameControls: React.ReactNode;
  gameStatus?: React.ReactNode;
  coachPanel: React.ReactNode;
  activePanel: 'analyst' | 'coach' | null;
  onPanelChange: (panel: 'analyst' | 'coach' | null) => void;
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

const renderTradeTooltip = ({ content }: { content: string | null }) => {
    if (!content) return null;

    try {
        const parsed = JSON.parse(content);
        if (parsed && parsed.give && parsed.receive) {
            const giveMeta = RESOURCE_META.find(r => r.name === parsed.give);
            const receiveMeta = RESOURCE_META.find(r => r.name === parsed.receive);

            if (giveMeta && receiveMeta) {
                return (
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <span className="font-bold">{parsed.giveAmount || BANK_TRADE_GIVE_AMOUNT}</span>
                            <giveMeta.Icon className={giveMeta.color} size={16} />
                        </span>
                        <ArrowRight size={16} className="text-slate-400" />
                        <span className="flex items-center gap-1">
                            <span className="font-bold">{parsed.receiveAmount || BANK_TRADE_RECEIVE_AMOUNT}</span>
                            <receiveMeta.Icon className={receiveMeta.color} size={16} />
                        </span>
                    </div>
                );
            }
        }
    } catch {
        // Ignore parsing errors, fall through to default return
    }

    // Default fallback for plain text or invalid JSON structure
    return <div>{content}</div>;
};

export const GameLayout: React.FC<GameLayoutProps> = ({
  board,
  dashboard,
  playerPanel,
  gameControls,
  gameStatus,
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
        onClick={() => togglePanel('coach')}
        aria-label="Toggle Coach Bot"
        aria-expanded={activePanel === 'coach'}
        aria-controls="coach-bot-panel"
    >
        <Bot size={24} />
    </button>
  ) : null;

  // Use JS-calculated height to handle inconsistent vh/dvh across mobile/tablet browsers
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      return `${window.innerHeight}px`;
    }
    return '100vh'; // Fallback for SSR
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setViewportHeight(`${window.innerHeight}px`);
      }, 150); // Debounce resize events for 150ms
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
