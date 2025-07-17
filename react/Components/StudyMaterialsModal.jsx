import React, { useState, useEffect } from 'react';
import BaseModal from './shared/BaseModal';
import corpusChoicesManager from '../Managers/corpusChoicesManager';
import { fetchLevels } from '../Utilities/apiClient';

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
  const [levelsData, setLevelsData] = useState({});
  const [levelsLoading, setLevelsLoading] = useState(false);

  // Sync local state with props when they change
  useEffect(() => {
    setLocalSelectedGroups(selectedGroups);
  }, [selectedGroups]);

  // Fetch levels data when modal opens
  useEffect(() => {
    if (isOpen && Object.keys(levelsData).length === 0 && !levelsLoading) {
      setLevelsLoading(true);
      fetchLevels()
        .then(levels => {
          setLevelsData(levels);
        })
        .catch(error => {
          console.error('Failed to fetch levels:', error);
        })
        .finally(() => {
          setLevelsLoading(false);
        });
    }
  }, [isOpen]);

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

  const toggleCorpus = async (corpus, availableGroups = null) => {
    const allGroups = availableGroups || Object.keys(corporaData[corpus]?.groups || {});
    const currentGroups = localSelectedGroups[corpus] || [];
    const allSelected = allGroups.length > 0 && allGroups.every(g => currentGroups.includes(g));
    
    let newGroups;
    if (availableGroups) {
      // Level-specific toggle: only toggle the groups available in this level
      if (allSelected) {
        // Remove only the level-specific groups
        newGroups = currentGroups.filter(g => !availableGroups.includes(g));
      } else {
        // Add the level-specific groups that aren't already selected
        newGroups = [...new Set([...currentGroups, ...availableGroups])];
      }
    } else {
      // Full corpus toggle (fallback behavior)
      newGroups = allSelected ? [] : allGroups;
    }

    // Update local state immediately for responsive UI
    setLocalSelectedGroups(prev => ({
      ...prev,
      [corpus]: newGroups
    }));

    // Update using corpus choices manager - this will notify listeners and update state
    await corpusChoicesManager.updateCorpusChoices(corpus, newGroups);
  };

  // Organize corpuses by level
  const organizeCorpusByLevel = () => {
    if (Object.keys(levelsData).length === 0) {
      // Fallback to original behavior if levels data is not available
      return [{ 
        level: 'All Materials', 
        corpusGroups: availableCorpora.map(corpus => ({
          corpus,
          groups: Object.keys(corporaData[corpus]?.groups || {})
        }))
      }];
    }

    const levelOrder = Object.keys(levelsData).sort((a, b) => {
      const levelA = parseInt(a.replace('level_', ''));
      const levelB = parseInt(b.replace('level_', ''));
      return levelA - levelB;
    });

    const organizedLevels = levelOrder.map(levelKey => {
      const levelNum = levelKey.replace('level_', '');
      
      // Group by corpus, collecting only the groups that belong to this level
      const corpusGroupsMap = {};
      const levelItems = levelsData[levelKey];
      
      if (levelItems && Array.isArray(levelItems)) {
        levelItems.forEach(item => {
          if (availableCorpora.includes(item.corpus)) {
            if (!corpusGroupsMap[item.corpus]) {
              corpusGroupsMap[item.corpus] = [];
            }
            corpusGroupsMap[item.corpus].push(item.group);
          }
        });
      } else if (levelItems) {
        console.warn(`Level data for ${levelKey} is not an array:`, levelItems);
      }
      
      const corpusGroups = Object.entries(corpusGroupsMap).map(([corpus, groups]) => ({
        corpus,
        groups
      }));
      
      return {
        level: `Level ${levelNum}`,
        corpusGroups
      };
    });

    // Add any groups that aren't in the levels data
    const groupsInLevels = new Set();
    Object.values(levelsData).forEach(levelItems => {
      if (Array.isArray(levelItems)) {
        levelItems.forEach(item => {
          if (availableCorpora.includes(item.corpus)) {
            groupsInLevels.add(`${item.corpus}:${item.group}`);
          }
        });
      }
    });
    
    const uncategorizedCorpusGroups = [];
    availableCorpora.forEach(corpus => {
      const allGroups = Object.keys(corporaData[corpus]?.groups || {});
      const uncategorizedGroups = allGroups.filter(group => 
        !groupsInLevels.has(`${corpus}:${group}`)
      );
      
      if (uncategorizedGroups.length > 0) {
        uncategorizedCorpusGroups.push({
          corpus,
          groups: uncategorizedGroups
        });
      }
    });
    
    if (uncategorizedCorpusGroups.length > 0) {
      organizedLevels.push({
        level: 'Other Materials',
        corpusGroups: uncategorizedCorpusGroups
      });
    }

    return organizedLevels.filter(level => level.corpusGroups.length > 0);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Study Materials (${localTotalSelectedWords} words selected)`}
      ariaLabel="Study materials selection"
    >
      <div className="w-settings-form" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {levelsLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading levels...
          </div>
        ) : (
          organizeCorpusByLevel().map(({ level, corpusGroups }) => (
            <div key={level} className="trakaido-level-section">
              <h3 style={{ 
                margin: '20px 0 10px 0', 
                fontSize: '1.1rem', 
                fontWeight: 'bold',
                color: '#333',
                borderBottom: '2px solid #ddd',
                paddingBottom: '5px'
              }}>
                {level}
              </h3>
              {corpusGroups.map(({ corpus, groups }) => {
                const corporaStructure = corporaData[corpus];
                if (!corporaStructure) return null;
                const selectedCorpusGroups = localSelectedGroups[corpus] || [];
                const levelSelectedGroups = groups.filter(g => selectedCorpusGroups.includes(g));
                const allSelected = groups.length > 0 && groups.every(g => selectedCorpusGroups.includes(g));
                const wordCount = levelSelectedGroups.reduce((total, g) => {
                  return total + (corporaStructure.groups[g]?.length || 0);
                }, 0);
                return (
                  <div key={corpus} className="trakaido-corpus-section">
                    <div className="trakaido-corpus-header" onClick={() => toggleCorpus(corpus, groups)}>
                      <div>
                        📚 {corpus} ({wordCount} words from {levelSelectedGroups.length}/{groups.length} groups)
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
          ))
        )}

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