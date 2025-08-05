import React from 'react';

interface Stats {
  correct: number;
  incorrect: number;
  total: number;
}

interface StatsDisplayProps {
  stats: Stats;
  onReset: () => void;
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats, onReset }) => {
  return (
    <div className="w-stats">
      <div className="w-stat-item">
        <div className="w-stat-value" style={{ color: 'var(--color-success)' }}>
          {stats.correct}
        </div>
        <div className="w-stat-label">Correct</div>
      </div>
      <div className="w-stat-item">
        <div className="w-stat-value" style={{ color: 'var(--color-error)' }}>
          {stats.incorrect}
        </div>
        <div className="w-stat-label">Incorrect</div>
      </div>
      <div className="w-stat-item">
        <div className="w-stat-value">
          {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
        </div>
        <div className="w-stat-label">Accuracy</div>
      </div>
      <button 
        className="w-button-secondary" 
        onClick={onReset}
      >
        🔄 Reset
      </button>
    </div>
  );
};

export default StatsDisplay;