import React, { useState, useEffect } from 'react';
import BaseModal from './shared/BaseModal';
import corpusChoicesManager from '../corpusChoicesManager';

const StudyMaterialsModal = ({
  isOpen,
  onClose,
  totalSelectedWords,
  availableCorpora,
  corporaData,
  selectedGroups,
  resetAllSettings,
  safeStorage
}) => {
  // Local state for immediate UI updates
  const [localSelectedGroups, setLocalSelectedGroups] = useState({});

  // Sync local state with props when they change
  useEffect(() => {
    setLocalSelectedGroups(selectedGroups);
  }, [selectedGroups]);

  // Calculate total selected words based on local state for immediate updates
  const localTotalSelectedWords = Object.entries(localSelectedGroups).reduce((total, [corpus, groups]) => {
    const corporaStructure = corporaData[corpus];
    if (!corporaStructure) return total;

    return total + groups.reduce((corpusTotal, group) => {
      return corpusTotal + (corporaStructure.groups[group]?.length || 0);
    }, 0);
  }, 0);

  const toggleGroup = async (corpus, group) => {
    const currentGroups = localSelectedGroups[corpus] || [];
    const newGroups = currentGroups.includes(group)
      ? currentGroups.filter(g => g !== group)
      : [...currentGroups, group];

    // Update local state immediately for responsive UI
    setLocalSelectedGroups(prev => ({
      ...prev,
      [corpus]: newGroups
    }));

    // Update using corpus choices manager - this will notify listeners and update state
    await corpusChoicesManager.updateCorpusChoices(corpus, newGroups);
  };

  const toggleCorpus = async (corpus) => {
    const allGroups = Object.keys(corporaData[corpus]?.groups || {});
    const currentGroups = localSelectedGroups[corpus] || [];
    const allSelected = allGroups.length > 0 && allGroups.every(g => currentGroups.includes(g));
    const newGroups = allSelected ? [] : allGroups;

    // Update local state immediately for responsive UI
    setLocalSelectedGroups(prev => ({
      ...prev,
      [corpus]: newGroups
    }));

    // Update using corpus choices manager - this will notify listeners and update state
    await corpusChoicesManager.updateCorpusChoices(corpus, newGroups);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Study Materials (${localTotalSelectedWords} words selected)`}
      ariaLabel="Study materials selection"
    >
      <div className="w-settings-form" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {availableCorpora.map(corpus => {
          const corporaStructure = corporaData[corpus];
          if (!corporaStructure) return null;
          const groups = Object.keys(corporaStructure.groups);
          const selectedCorpusGroups = localSelectedGroups[corpus] || [];
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

        <button
          className="w-mode-option w-compact-button"
          onClick={() => resetAllSettings().catch(console.error)}
          title="Reset all settings and storage configuration"
        >
          <span>🔄 Reset All Settings</span>
        </button>
      </div>

      <div className="w-settings-actions">
        <button
          onClick={onClose}
          className="w-settings-button w-settings-button-primary"
        >
          Done
        </button>
      </div>
    </BaseModal>
  );
};

export default StudyMaterialsModal;