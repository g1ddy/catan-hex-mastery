import React from 'react';
import { BoardStats, GameState } from '../game/types';
import { calculatePlayerPotentialPips } from '../game/analyst';
import { ResourceIconRow } from './ResourceIconRow';
import { RefreshCw } from 'lucide-react';

interface AnalystPanelProps {
  stats: BoardStats;
  onRegenerate?: () => void;
  canRegenerate: boolean;
  G?: GameState;
  showCoachMode?: boolean;
  setShowCoachMode?: (show: boolean) => void;
}

const AnalystPanel: React.FC<AnalystPanelProps> = ({ stats, onRegenerate, canRegenerate = true, G, showCoachMode, setShowCoachMode }) => {
  const getFairnessColorClass = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };

  const playerPotentials = G ? calculatePlayerPotentialPips(G) : null;

  return (
    <div className="text-slate-100 h-full">
      <div className="flex flex-col gap-4 mb-5">

        {/* Coach Mode Toggle */}
        {setShowCoachMode && (
          <label className="flex items-center justify-between bg-slate-800 p-3 rounded border border-slate-700 cursor-pointer hover:bg-slate-750 hover:border-slate-600 transition-colors group">
             <span className="font-semibold text-sm group-hover:text-amber-400 transition-colors">Coach Mode</span>
             <div className="relative inline-flex items-center">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={showCoachMode}
                    onChange={(e) => setShowCoachMode(e.target.checked)}
                    aria-label="Toggle Coach Mode"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
             </div>
          </label>
        )}

        {onRegenerate && (
          <button
            disabled={!canRegenerate}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors w-full btn-focus-ring"
            onClick={handleRegenerate}
          >
            <RefreshCw size={18} className={canRegenerate ? "" : "opacity-50"} />
            Regenerate Board
          </button>
        )}
      </div>

      {playerPotentials && G && (
        <div className="mb-5">
            <h3 className="text-lg font-semibold mb-2">Player Production Potential</h3>
            <div className="flex flex-col gap-2">
                {Object.values(G.players).map(player => (
                    <div key={player.id} className="bg-slate-800 p-2 rounded border border-slate-700">
                        <div className="flex items-center gap-2 font-bold text-sm mb-1">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: player.color }}></div>
                             Player {Number(player.id) + 1}
                        </div>
                        <ResourceIconRow resources={playerPotentials[player.id]} size="sm" />
                    </div>
                ))}
            </div>
        </div>
      )}

      <div className="mb-5">
        <h3 className="text-lg font-semibold mb-2">Fairness Score</h3>
        <div className={`text-3xl font-bold ${getFairnessColorClass(stats.fairnessScore)}`}>
          {stats.fairnessScore} / 100
        </div>
      </div>

      <div className="mb-5">
        <h3 className="text-lg font-semibold mb-2">Pip Distribution</h3>
        <ul className="list-none p-0">
          {Object.entries(stats.totalPips).map(([resource, pips]) => (
            <li key={resource} className="flex justify-between py-1 border-b border-slate-700">
              <span className="capitalize text-slate-300">{resource}</span>
              <strong className="text-slate-100">{pips} pips</strong>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Warnings</h3>
        {stats.warnings.length === 0 ? (
          <p className="text-green-400">No issues detected.</p>
        ) : (
          <ul className="text-red-300 pl-5 list-disc">
            {stats.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AnalystPanel;
