import React, { useState, useEffect } from 'react';
import { BarChart2, X } from 'lucide-react';
import './GameLayout.css';

interface GameLayoutProps {
  board: React.ReactNode;
  dashboard: React.ReactNode;
}

export const GameLayout: React.FC<GameLayoutProps> = ({ board, dashboard }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isMobile) {
    // Desktop Layout: Side-by-side
    return (
      <div className="game-layout-desktop">
        <div className="board-area">{board}</div>
        <aside className="sidebar-area bg-slate-900/90 backdrop-blur-md border-l border-slate-700 shadow-2xl overflow-y-auto p-5">
          {dashboard}
        </aside>
      </div>
    );
  }

  // Mobile Layout: Layered
  return (
    <div className="game-layout-mobile">
      <div className="board-layer">{board}</div>

      {/* Floating Action Button */}
      <button
        className="fab-stats"
        onClick={() => setShowDashboard(true)}
        aria-label="Open Stats"
      >
        <BarChart2 size={24} />
      </button>

      {/* Bottom Sheet Overlay */}
      {showDashboard && (
        <div className="bottom-sheet-overlay">
          <div className="backdrop" onClick={() => setShowDashboard(false)} />
          <div className="bottom-sheet bg-slate-900/95 backdrop-blur-md border-t border-slate-700 text-slate-100">
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
