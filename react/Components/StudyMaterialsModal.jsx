import { useEffect, useState } from 'react';
import corpusChoicesManager from '../Managers/corpusChoicesManager';
import {
  calculateTotalSelectedWords,
  isLevelSelected,
  organizeCorpusByLevel,
  organizeLevelsForDisplay
} from '../Utilities/studyMaterialsUtils';
import BaseModal from './shared/BaseModal';

const StudyMaterialsModal = ({
  isOpen,
  onClose,
  totalSelectedWords,
  availableCorpora,
  corporaData,
  selectedGroups,
  levelsData,
  resetAllSettings,
  safeStorage
}) => {
  // Local state for immediate UI updates
  const [localSelectedGroups, setLocalSelectedGroups] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync local state with props when they change
  useEffect(() => {
    setLocalSelectedGroups(selectedGroups);
  }, [selectedGroups]);

  // Calculate total selected words based on local state for immediate updates
  const localTotalSelectedWords = calculateTotalSelectedWords(localSelectedGroups, corporaData);

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


  // Toggle entire level
  const toggleLevel = async (levelKey) => {
    const levelItems = levelsData[levelKey];
    if (!levelItems || !Array.isArray(levelItems)) return;

    // Group items by corpus
    const corpusGroupsMap = {};
    levelItems.forEach(item => {
      if (availableCorpora.includes(item.corpus)) {
        if (!corpusGroupsMap[item.corpus]) {
          corpusGroupsMap[item.corpus] = [];
        }
        corpusGroupsMap[item.corpus].push(item.group);
      }
    });

    // Check if all groups in this level are currently selected
    const allLevelGroups = Object.entries(corpusGroupsMap);
    const allSelected = isLevelSelected(levelKey, levelsData, availableCorpora, localSelectedGroups);

    // Update each corpus
    for (const [corpus, groups] of allLevelGroups) {
      const currentGroups = localSelectedGroups[corpus] || [];
      let newGroups;
      
      if (allSelected) {
        // Remove level groups
        newGroups = currentGroups.filter(g => !groups.includes(g));
      } else {
        // Add level groups
        newGroups = [...new Set([...currentGroups, ...groups])];
      }

      // Update local state immediately
      setLocalSelectedGroups(prev => ({
        ...prev,
        [corpus]: newGroups
      }));

      // Update using corpus choices manager
      await corpusChoicesManager.updateCorpusChoices(corpus, newGroups);
    }
  };


  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Study Materials (${localTotalSelectedWords} words selected)`}
      ariaLabel="Study materials selection"
    >
      <div className="w-settings-form" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {!levelsData || Object.keys(levelsData).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading levels...
          </div>
        ) : (
          <div className="trakaido-levels-container">
            {organizeLevelsForDisplay(levelsData, availableCorpora, corporaData, localSelectedGroups).map(({ levelKey, level, description, preview, selectedWords, totalWords, isSelected }) => (
              <div key={levelKey} className="trakaido-level-item" style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                margin: '10px 0',
                padding: '15px',
                backgroundColor: isSelected ? '#f0f8ff' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <div 
                  onClick={() => levelKey !== 'all' && levelKey !== 'other' ? toggleLevel(levelKey) : null}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px',
                    cursor: levelKey !== 'all' && levelKey !== 'other' ? 'pointer' : 'default'
                  }}
                >
                  {levelKey !== 'all' && levelKey !== 'other' && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleLevel(levelKey)}
                      style={{ 
                        marginTop: '2px',
                        transform: 'scale(1.2)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <h3 style={{ 
                        margin: 0, 
                        fontSize: '1.1rem', 
                        fontWeight: 'bold',
                        color: '#333'
                      }}>
                        {level}
                      </h3>
                      <span style={{ 
                        fontSize: '0.9rem', 
                        color: '#666',
                        fontWeight: 'bold'
                      }}>
                        {selectedWords}/{totalWords} words
                      </span>
                    </div>
                    
                    <div style={{ 
                      fontSize: '0.95rem', 
                      color: '#555',
                      marginBottom: '6px',
                      fontWeight: '500'
                    }}>
                      {description}
                    </div>
                    
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: '#777',
                      fontStyle: 'italic'
                    }}>
                      {preview}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Advanced Section */}
        <div style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '15px' }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 0'
            }}
          >
            <span style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              ▶
            </span>
            Advanced: Individual Group Selection
          </button>
          
          {showAdvanced && (
            <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>
                Select individual vocabulary groups within each level for precise control.
              </div>
              {organizeCorpusByLevel(levelsData, availableCorpora, corporaData).map(({ level, corpusGroups }) => (
                <div key={level} className="trakaido-level-section">
                  <h4 style={{ 
                    margin: '15px 0 8px 0', 
                    fontSize: '1rem', 
                    fontWeight: 'bold',
                    color: '#444',
                    borderBottom: '1px solid #ccc',
                    paddingBottom: '3px'
                  }}>
                    {level}
                  </h4>
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
                      <div key={corpus} className="trakaido-corpus-section" style={{ marginBottom: '10px' }}>
                        <div 
                          className="trakaido-corpus-header" 
                          onClick={() => toggleCorpus(corpus, groups)}
                          style={{
                            cursor: 'pointer',
                            padding: '8px',
                            backgroundColor: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ fontSize: '0.9rem' }}>
                            📚 {corpus} ({wordCount} words from {levelSelectedGroups.length}/{groups.length} groups)
                          </div>
                          <button 
                            className="trakaido-corpus-toggle"
                            style={{
                              background: 'none',
                              border: '1px solid #ccc',
                              borderRadius: '3px',
                              padding: '4px 8px',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div 
                          className="trakaido-group-grid"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '8px',
                            marginTop: '8px',
                            padding: '8px'
                          }}
                        >
                          {groups.map(group => {
                            const groupWordCount = corporaStructure.groups[group]?.length || 0;
                            const isSelected = selectedCorpusGroups.includes(group);
                            return (
                              <div key={group} className="trakaido-group-item" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input
                                  type="checkbox"
                                  id={`${corpus}-${group}`}
                                  checked={isSelected}
                                  onChange={() => toggleGroup(corpus, group)}
                                />
                                <label htmlFor={`${corpus}-${group}`} style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
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
              ))}
            </div>
          )}
        </div>

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