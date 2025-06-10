
import React from 'react';

const StudyMaterialsSelector = ({
  showCorpora,
  setShowCorpora,
  totalSelectedWords,
  availableCorpora,
  corporaData,
  selectedGroups,
  setSelectedGroups,
  safeStorage
}) => {
  const toggleGroup = (corpus, group) => {
    setSelectedGroups(prev => {
      const currentGroups = prev[corpus] || [];
      const newGroups = currentGroups.includes(group)
        ? currentGroups.filter(g => g !== group)
        : [...currentGroups, group];
      safeStorage.setItem('flashcard-selected-groups', JSON.stringify({...prev, [corpus]: newGroups}));
      return { ...prev, [corpus]: newGroups };
    });
  };

  const toggleCorpus = (corpus) => {
    setSelectedGroups(prev => {
      const allGroups = Object.keys(corporaData[corpus]?.groups || {});
      const currentGroups = prev[corpus] || [];
      const allSelected = allGroups.length > 0 && allGroups.every(g => currentGroups.includes(g));
      const newGroups = allSelected ? [] : allGroups;
      safeStorage.setItem('flashcard-selected-groups', JSON.stringify({...prev, [corpus]: newGroups}));
      return {
        ...prev,
        [corpus]: newGroups
      };
    });
  };
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
              <div key={corpus} className="trakaido-corpus-section">
                <div className="trakaido-corpus-header" onClick={() => toggleCorpus(corpus)}>
                  <div>
                    📚 {corpus} ({wordCount} words from {selectedCorpusGroups.length}/{groups.length} groups)
                  </div>
                  <button className="trakaido-corpus-toggle">
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="trakaido-group-grid">
                  {groups.map(group => {
                    const groupWordCount = corporaStructure.groups[group]?.length || 0;
                    const isSelected = selectedCorpusGroups.includes(group);
                    return (
                      <div key={group} className="trakaido-group-item">
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
