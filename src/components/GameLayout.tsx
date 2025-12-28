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

  // Mobile Layout: Overlay "Map-First"
  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900">
      {/* 1. Wallpaper Board: Absolute, Full Screen */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {board}
      </div>

      {/* 2. Top Center Overlay: Player Panel */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none flex justify-center">
          <div className="pointer-events-auto">
             {playerPanel}
          </div>
      </div>

      {/* 3. Bottom Floating Action Bar */}
      <div className="absolute bottom-6 left-4 right-4 z-20 pointer-events-none flex items-center justify-between gap-4">
         {/* Stats Toggle */}
          <button
              className="flex-none p-3 rounded-xl bg-slate-900/90 backdrop-blur-md text-slate-300 hover:text-white hover:bg-slate-700 transition-all active:scale-95 pointer-events-auto border border-slate-700 shadow-lg"
              onClick={() => setShowDashboard(true)}
              aria-label="Open Stats"
          >
              <BarChart2 size={24} />
          </button>

         {/* Game Controls */}
         <div className="pointer-events-auto flex-grow">
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
