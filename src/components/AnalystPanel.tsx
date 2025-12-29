import React from 'react';
import { BoardStats, GameState } from '../game/types';
import { calculatePlayerPotentialPips } from '../game/analyst';
import { ResourceIconRow } from './ResourceIconRow';

interface AnalystPanelProps {
  stats: BoardStats;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
  G?: GameState;
}

const AnalystPanel: React.FC<AnalystPanelProps> = ({ stats, onRegenerate, showRegenerate, G }) => {
  const getFairnessColorClass = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const playerPotentials = G ? calculatePlayerPotentialPips(G) : null;

  return (
    <div className="text-slate-100 h-full">
      <div className="flex justify-between items-center flex-wrap gap-2.5 mb-5">
        <h2 className="text-xl font-bold">Analyst Dashboard</h2>
        {showRegenerate && onRegenerate && (
          <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors" onClick={onRegenerate}>
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
