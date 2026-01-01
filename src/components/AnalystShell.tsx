import React from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { X } from 'lucide-react';
import { Z_INDEX_BOTTOM_SHEET } from '../styles/z-indices';

interface AnalystShellProps {
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

export const AnalystShell: React.FC<AnalystShellProps> = ({ children, isOpen, onToggle }) => {
  const isMobile = useIsMobile();

  // Desktop: Sidebar
  if (!isMobile) {
    return (
      <aside
        className={`
          flex-shrink-0
          bg-slate-900/90 backdrop-blur-md border-r border-slate-700
          transition-all duration-300 ease-in-out
          overflow-hidden
          flex flex-col
          ${isOpen ? 'w-80' : 'w-0 border-r-0'}
        `}
      >
        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
           {children}
        </div>
      </aside>
    );
  }

  // Mobile: Top Drawer
  return (
    <>
      {/* Overlay/Backdrop */}
      <div
        className={`
          fixed inset-0 z-[${Z_INDEX_BOTTOM_SHEET}] bg-black/50 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onToggle}
      />

      {/* Drawer Panel */}
      <div
        className={`
          fixed top-0 left-0 right-0 z-[${Z_INDEX_BOTTOM_SHEET}]
          bg-slate-900/95 backdrop-blur-md border-b border-slate-700
          shadow-2xl text-slate-100
          transition-transform duration-300 ease-out
          max-h-[80vh] flex flex-col
          ${isOpen ? 'translate-y-0' : '-translate-y-full'}
        `}
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
           <span className="font-bold text-lg text-amber-400">Analyst Dashboard</span>
           <button
             onClick={onToggle}
             className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
             aria-label="Close Analyst Panel"
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
