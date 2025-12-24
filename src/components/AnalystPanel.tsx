import React from 'react';
import { BoardStats } from '../game/types';
import './AnalystPanel.css';

interface AnalystPanelProps {
  stats: BoardStats;
  showHints: boolean;
  onToggleHints: (show: boolean) => void;
}

const AnalystPanel: React.FC<AnalystPanelProps> = ({ stats, showHints, onToggleHints }) => {
  const getFairnessColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 70) return 'orange';
    return 'red';
  };

  return (
    <div className="analyst-panel">
      <h2>Analyst Dashboard</h2>

      <div className="analyst-section">
          <h3>Coach Mode</h3>
          <label className="toggle-switch">
              <input
                  type="checkbox"
                  checked={showHints}
                  onChange={(e) => onToggleHints(e.target.checked)}
              />
              <span className="slider"></span>
              <span className="label-text">Show Hints</span>
          </label>
      </div>

      <div className="analyst-section">
        <h3>Fairness Score</h3>
        <div className="fairness-score" style={{ color: getFairnessColor(stats.fairnessScore) }}>
          {stats.fairnessScore} / 100
        </div>
      </div>

      <div className="analyst-section">
        <h3>Pip Distribution</h3>
        <ul className="pip-list">
          {Object.entries(stats.totalPips).map(([resource, pips]) => (
            <li key={resource} className="pip-list-item">
              <span className="resource-name">{resource}</span>
              <strong>{pips} pips</strong>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3>Warnings</h3>
        {stats.warnings.length === 0 ? (
          <p className="no-issues">No issues detected.</p>
        ) : (
          <ul className="warnings-list">
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
