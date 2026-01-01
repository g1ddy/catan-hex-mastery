import React, { useState } from 'react';
import {
    Z_INDEX_BOARD,
    Z_INDEX_TOOLTIP,
    Z_INDEX_GAME_CONTROLS_CONTAINER
} from '../styles/z-indices';
import { BarChart2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useIsMobile } from '../hooks/useIsMobile';
import { Resources } from '../game/types';
import { RESOURCE_META } from './uiConfig';
import { AnalystShell } from './AnalystShell';

interface GameLayoutProps {
  board: React.ReactNode;
  dashboard: React.ReactNode;
  playerPanel: React.ReactNode;
  gameControls: React.ReactNode;
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

export const GameLayout: React.FC<GameLayoutProps> = ({ board, dashboard, playerPanel, gameControls }) => {
  const isMobile = useIsMobile();
  const [isAnalystOpen, setIsAnalystOpen] = useState(!isMobile); // Default open on desktop

  // Toggle button component
  const AnalystToggle = (
    <button
        className={`
            fixed top-4 left-4 z-[${Z_INDEX_GAME_CONTROLS_CONTAINER}]
            p-3 rounded-xl bg-slate-900/90 backdrop-blur-md text-slate-300
            hover:text-white hover:bg-slate-700 transition-all active:scale-95
            border border-slate-700 shadow-lg
        `}
        onClick={() => setIsAnalystOpen(!isAnalystOpen)}
        aria-label="Toggle Analyst Dashboard"
    >
        <BarChart2 size={24} />
    </button>
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      <Toaster />
      <Tooltip id="resource-tooltip" place="top" className={`z-[${Z_INDEX_TOOLTIP}]`} />
      <Tooltip
          id="cost-tooltip"
          place="top"
          className={`z-[${Z_INDEX_TOOLTIP}]`}
          render={renderCostTooltip}
      />

      {/* 1. Mobile Top Toggle Button (Always visible for now) */}
      {AnalystToggle}

      {/* 2. Analyst Panel (Sidebar on Desktop, Drawer on Mobile) */}
      <AnalystShell isOpen={isAnalystOpen} onToggle={() => setIsAnalystOpen(!isAnalystOpen)}>
          {dashboard}
      </AnalystShell>

      {/* 3. Main Content Area */}
      <main className="flex-grow flex flex-col h-full relative overflow-hidden">

          {/* Middle Section: Board + Player Panel */}
          <div className="flex-grow flex flex-col md:flex-row relative overflow-hidden">

              {/* Board Area */}
              {/*
                  Removed 'h-full' to prevent forcing 100% height in flex-col (mobile),
                  which would push PlayerPanel out of view.
                  'flex-grow' ensures it takes available space.
                  'relative' contains the absolute board layer.
              */}
              <div className="flex-grow relative w-full">
                   {/* Board Background Layer */}
                   <div className={`absolute inset-0 z-[${Z_INDEX_BOARD}]`}>
                        {board}
                   </div>
              </div>

              {/* Player Panel Area */}
              <div className="
                  flex-shrink-0 z-10 p-2 md:p-0
                  md:h-full md:w-64 md:border-l md:border-slate-700 md:bg-slate-900/50
              ">
                   <div className="md:h-full md:overflow-y-auto">
                        {playerPanel}
                   </div>
              </div>
          </div>

          {/* Bottom Section: Game Controls */}
          <div className={`
              flex-shrink-0 z-[${Z_INDEX_GAME_CONTROLS_CONTAINER}]
              p-2 pb-6 md:p-4
              flex justify-center
          `}>
              <div className="w-full max-w-4xl">
                 {gameControls}
              </div>
          </div>
      </main>

    </div>
  );
};
