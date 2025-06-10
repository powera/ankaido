
import React from 'react';

const StudyMaterialsSelector = ({
  showCorpora,
  setShowCorpora,
  totalSelectedWords,
  availableCorpora,
  corporaData,
  selectedGroups,
  toggleGroup,
  toggleCorpus
}) => {
  return (
    <div className="w-card">
      <div 
        className="w-game-header"
        style={{ 
          cursor: 'pointer', 
          marginBottom: showCorpora ? 'var(--spacing-base)' : '0'
        }}
        onClick={() => setShowCorpora(!showCorpora)}
      >
        <h3>Study Materials ({totalSelectedWords} words selected)</h3>
        <button className="w-button-secondary">
          {showCorpora ? '▼' : '▶'}
        </button>
      </div>
      {showCorpora && (
        <div>
          {availableCorpora.map(corpus => {
            const corporaStructure = corporaData[corpus];
            if (!corporaStructure) return null;
            const groups = Object.keys(corporaStructure.groups);
            const selectedCorpusGroups = selectedGroups[corpus] || [];
            const allSelected = groups.length > 0 && groups.every(g => selectedCorpusGroups.includes(g));
            const wordCount = selectedCorpusGroups.reduce((total, g) => {
              return total + (corporaStructure.groups[g]?.length || 0);
            }, 0);
            return (
              <div key={corpus} className="corpus-section">
                <div className="corpus-header" onClick={() => toggleCorpus(corpus)}>
                  <div>
                    📚 {corpus} ({wordCount} words from {selectedCorpusGroups.length}/{groups.length} groups)
                  </div>
                  <button className="corpus-toggle">
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="group-grid">
                  {groups.map(group => {
                    const groupWordCount = corporaStructure.groups[group]?.length || 0;
                    const isSelected = selectedCorpusGroups.includes(group);
                    return (
                      <div key={group} className="group-item">
                        <input
                          type="checkbox"
                          id={`${corpus}-${group}`}
                          checked={isSelected}
                          onChange={() => toggleGroup(corpus, group)}
                        />
                        <label htmlFor={`${corpus}-${group}`} style={{ fontSize: '0.9rem' }}>
                          {group} ({groupWordCount} words)
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudyMaterialsSelector;
