import React from 'react';
import { BoardStats, GameState } from '../../../game/core/types';
import { RefreshCw } from 'lucide-react';

export interface AnalystPanelProps {
  stats: BoardStats;
  onRegenerate?: () => void;
  canRegenerate: boolean;
  G?: GameState;
}

const AnalystPanel: React.FC<AnalystPanelProps> = ({ stats, onRegenerate, canRegenerate = true }) => {
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

  return (
    <div className="text-slate-100 h-full">
      <div className="flex flex-col gap-4 mb-5">

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
