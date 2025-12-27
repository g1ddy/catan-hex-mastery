import React from 'react';
import { BoardStats } from '../game/types';
import './AnalystPanel.css';

interface AnalystPanelProps {
  stats: BoardStats;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
}

const AnalystPanel: React.FC<AnalystPanelProps> = ({ stats, onRegenerate, showRegenerate }) => {
  const getFairnessColorClass = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="analyst-panel bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-2xl text-slate-100 rounded-xl">
      <div className="analyst-header">
        <h2 className="text-xl font-bold">Analyst Dashboard</h2>
        {showRegenerate && onRegenerate && (
          <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors" onClick={onRegenerate}>
            Regenerate Board
          </button>
        )}
      </div>

      <div className="analyst-section">
        <h3 className="text-lg font-semibold mb-2">Fairness Score</h3>
        <div className={`text-3xl font-bold ${getFairnessColorClass(stats.fairnessScore)}`}>
          {stats.fairnessScore} / 100
        </div>
      </div>

      <div className="analyst-section">
        <h3 className="text-lg font-semibold mb-2">Pip Distribution</h3>
        <ul className="pip-list">
          {Object.entries(stats.totalPips).map(([resource, pips]) => (
            <li key={resource} className="flex justify-between py-[5px] border-b border-slate-700 text-[0.9rem] md:text-base">
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
            {stats.warnings.map((w, i) => (
              <li key={`${w}-${i}`}>{w}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AnalystPanel;
