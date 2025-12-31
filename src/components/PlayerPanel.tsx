import React from 'react';
import { Z_INDEX_FLOATING_UI } from '../styles/z-indices';
import { GameState, Player } from '../game/types';
import { Trees } from 'lucide-react';
import { ResourceIconRow } from './ResourceIconRow';

interface PlayerPanelProps {
  players: GameState['players'];
  currentPlayerId: string;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({ players, currentPlayerId }) => {
  const playerList = Object.values(players);

  return (
    <div className={`
        player-panel
        absolute
        top-4 left-4 right-4
        md:top-20 md:left-4 md:right-auto md:w-64
        bg-slate-900/90 backdrop-blur-md border border-slate-700
        rounded-xl shadow-xl text-slate-100 z-[${Z_INDEX_FLOATING_UI}]
        transition-all
    `}>
      {/* Header - Desktop Only */}
      <h3 className="hidden md:block font-bold text-lg mb-2 p-4 pb-0">Players</h3>

      {/* Content Container */}
      <div className="
          flex flex-row overflow-x-auto scrollbar-hide p-2 px-3 items-center justify-center md:justify-start
          md:flex-col md:overflow-visible md:p-4 md:pt-2 md:gap-3
      ">
        {playerList.map((player: Player) => {
          const isActive = player.id === currentPlayerId;
          // Styles for active state differences
          const desktopBorder = isActive ? 'md:border-slate-400 md:bg-slate-800' : 'md:border-slate-700 md:bg-transparent';
          const mobileActive = isActive ? 'bg-slate-800 border-slate-600' : 'bg-transparent border-transparent opacity-75';

          return (
            <div key={player.id} className={`
                flex items-center gap-2 rounded border transition-colors flex-shrink-0
                p-1 px-2
                ${mobileActive}
                md:w-full md:block md:p-2 md:opacity-100
                ${desktopBorder}
            `}>
              {/* Header: Identity */}
              <div className="flex items-center gap-1 font-bold text-sm md:text-base md:mb-1">
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full shadow-sm" style={{ backgroundColor: player.color }}></div>

                {/* Text: P1 vs Player 1 */}
                <span className={`md:hidden ${isActive ? 'text-amber-400' : 'text-slate-300'}`}>
                    P{Number(player.id) + 1}
                </span>
                <span className="hidden md:inline text-slate-100">
                    Player {Number(player.id) + 1}
                </span>
              </div>

              {/* Desktop Details: VP, Sett, Roads */}
              <div className="hidden md:block text-sm text-slate-300 mt-1 mb-2">
                VP: {player.victoryPoints} | Sett: {player.settlements.length} | Roads: {player.roads.length}
              </div>

              {/* Resources & Mobile Summary */}
              <div className="flex items-center md:block">
                {/* Mobile Divider (Only if active) */}
                <div className={`md:hidden h-4 w-px bg-slate-600 mx-1 ${isActive ? 'block' : 'hidden'}`}></div>

                {/* Resource Row - Show if active on mobile, always on desktop */}
                <div className={`${isActive ? 'block' : 'hidden'} md:block`}>
                     {/* Use explicit display classes to switch sizes or just use one size that fits both?
                         Desktop uses 'md', Mobile uses 'sm'.
                     */}
                     <div className="md:hidden">
                        <ResourceIconRow resources={player.resources} size="sm" />
                     </div>
                     <div className="hidden md:block">
                        <ResourceIconRow resources={player.resources} size="md" />
                     </div>
                </div>

                 {/* Mobile Inactive Summary (VP + Count) */}
                 <div className={`md:hidden text-[10px] text-slate-400 flex items-center gap-1 ${!isActive ? 'block' : 'hidden'}`}>
                    VP:{player.victoryPoints} | <Trees size={10} className="inline"/> {Object.values(player.resources).reduce((a, b) => a + b, 0)}
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
