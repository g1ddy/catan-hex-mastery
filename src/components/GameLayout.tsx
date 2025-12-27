import React, { useState } from 'react';
import { BarChart2, X } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import './GameLayout.css';

interface GameLayoutProps {
  board: React.ReactNode;
  dashboard: React.ReactNode;
  playerPanel: React.ReactNode;
  gameControls: React.ReactNode;
}

export const GameLayout: React.FC<GameLayoutProps> = ({ board, dashboard, playerPanel, gameControls }) => {
  const isMobile = useIsMobile();
  const [showDashboard, setShowDashboard] = useState(false);

  if (!isMobile) {
    // Desktop Layout: Side-by-side
    // Note: playerPanel and gameControls are rendered inside the board area,
    // assuming they are passed as absolute positioned elements (variant="floating") for desktop.
    return (
      <div className="game-layout-desktop">
        <div className="board-area relative">
            {board}
            {playerPanel}
            {gameControls}
        </div>
        <aside className="sidebar-area bg-slate-900/90 backdrop-blur-md border-l border-slate-700 shadow-2xl overflow-y-auto p-5">
          {dashboard}
        </aside>
      </div>
    );
  }

  // Mobile Layout: Vertical Stack
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900">
      {/* Top: Board Area */}
      <div className="flex-grow relative overflow-hidden h-full">
        {board}
      </div>

      {/* Bottom: Controls Stack */}
      <div className="flex-none z-50 bg-slate-900 border-t border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        {/* Player Panel (Docked) */}
        {playerPanel}

        {/* Action Bar */}
        <div className="flex items-center justify-between p-2 px-4 gap-4">
            {/* Stats Toggle */}
            <button
                className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all active:scale-95"
                onClick={() => setShowDashboard(true)}
                aria-label="Open Stats"
            >
                <BarChart2 size={24} />
            </button>

            {/* Game Controls (Docked) */}
            {gameControls}
        </div>
      </div>

      {/* Bottom Sheet Overlay (Analyst Panel) */}
      {showDashboard && (
        <div className="bottom-sheet-overlay">
          <div className="backdrop" onClick={() => setShowDashboard(false)} />
          <div className="bottom-sheet bg-slate-900/95 backdrop-blur-md border-t border-slate-700 text-slate-100 z-[200]">
            <button
              className="close-sheet-btn text-slate-300 hover:text-white"
              onClick={() => setShowDashboard(false)}
              aria-label="Close Stats"
            >
              <X size={24} />
            </button>
            <div className="sheet-content px-5 pb-5">
              {dashboard}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
