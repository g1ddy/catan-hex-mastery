import React from 'react';
import { BoardStats } from '../game/types';

interface AnalystPanelProps {
  stats: BoardStats;
}

const AnalystPanel: React.FC<AnalystPanelProps> = ({ stats }) => {
  const getFairnessColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 70) return 'orange';
    return 'red';
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f5f5f5',
      color: '#333',
      borderLeft: '1px solid #ddd',
      height: '100%',
      width: '300px',
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      <h2 style={{ color: '#333' }}>Analyst Dashboard</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#333' }}>Fairness Score</h3>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: getFairnessColor(stats.fairnessScore)
        }}>
          {stats.fairnessScore} / 100
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#333' }}>Pip Distribution</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {Object.entries(stats.totalPips).map(([resource, pips]) => (
            <li key={resource} style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '5px',
              padding: '5px',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #ddd',
              color: '#333'
            }}>
              <span style={{ textTransform: 'capitalize' }}>{resource}</span>
              <strong>{pips} pips</strong>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 style={{ color: '#333' }}>Warnings</h3>
        {stats.warnings.length === 0 ? (
          <p style={{ color: 'green' }}>No issues detected.</p>
        ) : (
          <ul style={{ paddingLeft: '20px', color: '#d32f2f' }}>
            {stats.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AnalystPanel;
