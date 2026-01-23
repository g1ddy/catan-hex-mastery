import React from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { X, ChevronRight } from 'lucide-react';
import { Z_INDEX_OVERLAY_PANEL } from '../../../styles/z-indices';

interface CoachShellProps {
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

export const CoachShell: React.FC<CoachShellProps> = ({ children, isOpen, onToggle }) => {
  const isMobile = useIsMobile();

  // Desktop: Right Sidebar
  if (!isMobile) {
    return (
      <aside
        id="coach-bot-panel"
        className={`
          flex-shrink-0 min-w-0
          bg-slate-900/90 backdrop-blur-md border-l border-slate-700
          transition-all duration-300 ease-in-out
          overflow-hidden
          flex flex-col
          ${isOpen ? 'w-80' : 'w-0 border-l-0 invisible'}
        `}
      >
         {/* Desktop Header */}
         <div className="flex items-center justify-between p-4 pb-2 border-b border-slate-700/50">
            <span className="font-bold text-lg text-amber-400">Coach Bot</span>
            <button
                onClick={onToggle}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Collapse Coach Panel"
            >
                <ChevronRight size={24} />
            </button>
         </div>

        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
           {children}
        </div>
      </aside>
    );
  }

  // Mobile: Top Drawer (Same as Analyst)
  return (
    <>
      {/* Overlay/Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        style={{ zIndex: Z_INDEX_OVERLAY_PANEL }}
        onClick={onToggle}
      />

      {/* Drawer Panel */}
      <div
        id="coach-bot-panel-mobile"
        className={`
          fixed top-0 left-0 right-0
          bg-slate-900/95 backdrop-blur-md border-b border-slate-700
          shadow-2xl text-slate-100
          transition-transform duration-300 ease-out
          max-h-[80vh] flex flex-col
          ${isOpen ? 'translate-y-0' : '-translate-y-full invisible'}
        `}
        style={{ zIndex: Z_INDEX_OVERLAY_PANEL }}
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
           <span className="font-bold text-lg text-amber-400">Coach Bot</span>
           <button
             onClick={onToggle}
             className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
             aria-label="Close Coach Panel"
           >
             <X size={24} />
           </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
};
