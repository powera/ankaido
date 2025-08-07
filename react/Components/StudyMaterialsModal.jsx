import { useEffect, useState } from 'react';
import corpusChoicesManager from '../Managers/corpusChoicesManager';
import {
  calculateTotalSelectedWords
} from '../Utilities/studyMaterialsUtils';
import BaseModal from './shared/BaseModal';

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
      // Group-specific toggle: only toggle the specified groups
      if (allSelected) {
        // Remove only the specified groups
        newGroups = currentGroups.filter(g => !availableGroups.includes(g));
      } else {
        // Add the specified groups that aren't already selected
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





  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Study Materials (${localTotalSelectedWords} words selected)`}
      ariaLabel="Study materials selection"
    >
      <div className="w-settings-form" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <div className="trakaido-corpora-container">
          {availableCorpora.map(corpus => {
            const corporaStructure = corporaData[corpus];
            if (!corporaStructure) return null;
            
            const selectedCorpusGroups = localSelectedGroups[corpus] || [];
            const allGroups = Object.keys(corporaStructure.groups || {});
            const allSelected = allGroups.length > 0 && allGroups.every(g => selectedCorpusGroups.includes(g));
            const selectedWordCount = selectedCorpusGroups.reduce((total, g) => {
              return total + (corporaStructure.groups[g]?.length || 0);
            }, 0);
            const totalWordCount = allGroups.reduce((total, g) => {
              return total + (corporaStructure.groups[g]?.length || 0);
            }, 0);
            
            return (
              <div key={corpus} className="trakaido-corpus-item" style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                margin: '10px 0',
                padding: '15px',
                backgroundColor: allSelected ? '#f0f8ff' : '#fff',
                transition: 'all 0.2s ease'
              }}>
                <div 
                  onClick={() => toggleCorpus(corpus)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => toggleCorpus(corpus)}
                    style={{ 
                      marginTop: '2px',
                      transform: 'scale(1.2)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
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
                        📚 {corpus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>
                      <span style={{ 
                        fontSize: '0.9rem', 
                        color: '#666',
                        fontWeight: 'bold'
                      }}>
                        {selectedWordCount}/{totalWordCount} words
                      </span>
                    </div>
                    
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: '#777',
                      fontStyle: 'italic'
                    }}>
                      {selectedCorpusGroups.length}/{allGroups.length} groups selected
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

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
                Select individual vocabulary groups within each corpus for precise control.
              </div>
              {availableCorpora.map(corpus => {
                const corporaStructure = corporaData[corpus];
                if (!corporaStructure) return null;
                const selectedCorpusGroups = localSelectedGroups[corpus] || [];
                const allGroups = Object.keys(corporaStructure.groups || {});
                const allSelected = allGroups.length > 0 && allGroups.every(g => selectedCorpusGroups.includes(g));
                const wordCount = selectedCorpusGroups.reduce((total, g) => {
                  return total + (corporaStructure.groups[g]?.length || 0);
                }, 0);
                return (
                  <div key={corpus} className="trakaido-corpus-section" style={{ marginBottom: '15px' }}>
                    <div 
                      className="trakaido-corpus-header" 
                      onClick={() => toggleCorpus(corpus)}
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
                        📚 {corpus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} ({wordCount} words from {selectedCorpusGroups.length}/{allGroups.length} groups)
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
                      {allGroups.map(group => {
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