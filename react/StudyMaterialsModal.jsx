import React, { useState, useRef, useEffect } from 'react';

const StudyMaterialsModal = ({
  isOpen,
  onClose,
  totalSelectedWords,
  availableCorpora,
  corporaData,
  selectedGroups,
  setSelectedGroups,
  safeStorage
}) => {
  const modalRef = useRef(null);

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

  // Handle escape key and outside clicks
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (modalRef.current && event.target && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="w-settings-overlay">
      <div ref={modalRef} className="w-settings-modal">
        <div className="w-settings-header">
          <h2 className="w-settings-title">Study Materials ({totalSelectedWords} words selected)</h2>
          <button
            onClick={onClose}
            className="w-settings-close"
            aria-label="Close study materials"
          >
            ×
          </button>
        </div>

        <div className="w-settings-form" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
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

        <div className="w-settings-actions">
          <button
            onClick={onClose}
            className="w-settings-button w-settings-button-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyMaterialsModal;