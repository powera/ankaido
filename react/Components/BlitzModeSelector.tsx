import React from 'react';
import type { CorporaData, LevelsData, SelectedGroups } from '../Utilities/studyMaterialsUtils';
import { organizeLevelsForDisplay } from '../Utilities/studyMaterialsUtils';

// Types for content filtering
type ContentFilter = 'all' | 'words' | 'verbs';
type SelectionMode = 'corpus' | 'level';
type CorpusType = 'words' | 'verbs' | 'phrases';

// Types for Blitz mode configuration
interface BlitzCorpusConfig {
  corpus: string;
  useSelectedGroupsOnly: boolean;
  mode: 'corpus';
}

interface BlitzLevelConfig {
  levelKey: string;
  contentFilter: ContentFilter;
  mode: 'level';
}

type BlitzConfig = BlitzCorpusConfig | BlitzLevelConfig;

// Props interface
interface BlitzModeSelectorProps {
  availableCorpora: string[];
  corporaData: CorporaData;
  selectedGroups: SelectedGroups | null;
  levelsData: LevelsData | null;
  onStartBlitz: (config: BlitzConfig) => void;
  onCancel: () => void;
}

const BlitzModeSelector: React.FC<BlitzModeSelectorProps> = ({
  availableCorpora,
  corporaData,
  selectedGroups,
  levelsData,
  onStartBlitz,
  onCancel
}) => {
  const [selectedCorpus, setSelectedCorpus] = React.useState<string>('');
  const [selectedLevel, setSelectedLevel] = React.useState<string>('');
  const [useSelectedGroupsOnly, setUseSelectedGroupsOnly] = React.useState<boolean>(false);
  const [selectionMode, setSelectionMode] = React.useState<SelectionMode>('level'); // 'corpus' or 'level'
  const [contentFilter, setContentFilter] = React.useState<ContentFilter>('all'); // 'all', 'words', 'verbs'

  // Helper function to determine if a corpus contains verbs or words
  const getCorpusType = (corpus: string): CorpusType => {
    if (corpus.includes('verbs_')) return 'verbs';
    if (corpus.includes('phrases_')) return 'phrases';
    return 'words';
  };

  // Get word count for a specific level with content filtering
  const getLevelWordCount = (levelKey: string, filter: ContentFilter = 'all'): number => {
    if (!levelsData || !levelsData[levelKey]) return 0;
    
    const levelItems = levelsData[levelKey];
    let totalWords = 0;
    
    levelItems.forEach(item => {
      if (availableCorpora.includes(item.corpus)) {
        const corpusType = getCorpusType(item.corpus);
        
        // Apply content filter
        if (filter === 'words' && corpusType !== 'words') return;
        if (filter === 'verbs' && corpusType !== 'verbs' && corpusType !== 'phrases') return;
        
        const corporaStructure = corporaData[item.corpus];
        if (corporaStructure && corporaStructure.groups[item.group]) {
          // Check if this group is selected (if using selected groups only)
          if (useSelectedGroupsOnly && selectedGroups && selectedGroups[item.corpus]) {
            const selectedCorpusGroups = selectedGroups[item.corpus];
            if (selectedCorpusGroups.includes(item.group)) {
              totalWords += corporaStructure.groups[item.group].length;
            }
          } else {
            totalWords += corporaStructure.groups[item.group].length;
          }
        }
      }
    });
    
    return totalWords;
  };

  // Check if a level has mixed content types
  const levelHasMixedContent = (levelKey: string): boolean => {
    if (!levelsData || !levelsData[levelKey]) return false;
    
    const levelItems = levelsData[levelKey];
    const contentTypes = new Set<CorpusType>();
    
    levelItems.forEach(item => {
      if (availableCorpora.includes(item.corpus)) {
        contentTypes.add(getCorpusType(item.corpus));
      }
    });
    
    return contentTypes.size > 1;
  };

  // Get word count for all groups in corpus
  const getAllGroupsWordCount = (corpus: string): number => {
    if (!corporaData[corpus]) return 0;
    const groups = corporaData[corpus].groups || {};
    return Object.values(groups).reduce((total, groupWords) => total + groupWords.length, 0);
  };

  // Get word count for selected groups only
  const getSelectedGroupsWordCount = (corpus: string): number => {
    if (!corporaData[corpus] || !selectedGroups || !selectedGroups[corpus]) return 0;
    const groups = corporaData[corpus].groups || {};
    const selectedCorpusGroups = selectedGroups[corpus];
    return selectedCorpusGroups.reduce((total, groupName) => {
      return total + (groups[groupName]?.length || 0);
    }, 0);
  };

  // Auto-switch to "all groups" if "selected groups only" becomes invalid
  React.useEffect(() => {
    if (useSelectedGroupsOnly && selectedCorpus && getSelectedGroupsWordCount(selectedCorpus) < 20) {
      setUseSelectedGroupsOnly(false);
    }
  }, [selectedCorpus, selectedGroups, useSelectedGroupsOnly]);

  const handleStartBlitz = (): void => {
    if (selectionMode === 'corpus' && selectedCorpus) {
      onStartBlitz({
        corpus: selectedCorpus,
        useSelectedGroupsOnly,
        mode: 'corpus'
      });
    } else if (selectionMode === 'level' && selectedLevel) {
      onStartBlitz({
        levelKey: selectedLevel,
        contentFilter,
        mode: 'level'
      });
    }
  };

  const isStartEnabled: boolean = (selectionMode === 'corpus' && selectedCorpus !== '') || 
                        (selectionMode === 'level' && selectedLevel !== '');

  // Get current word count based on selection mode
  const getCurrentWordCount = (): number => {
    if (selectionMode === 'corpus' && selectedCorpus) {
      return getCorpusWordCount(selectedCorpus);
    } else if (selectionMode === 'level' && selectedLevel) {
      return getLevelWordCount(selectedLevel, contentFilter);
    }
    return 0;
  };

  // Get word count for selected corpus based on current settings
  const getCorpusWordCount = (corpus: string): number => {
    if (!corporaData[corpus]) return 0;
    const groups = corporaData[corpus].groups || {};
    
    // If all groups are selected, or no groups are selected, or not using selected groups only, use all groups
    const allGroupsCount = Object.keys(groups).length;
    const selectedGroupsCount = selectedGroups && selectedGroups[corpus] ? selectedGroups[corpus].length : 0;
    
    if (useSelectedGroupsOnly && selectedGroups && selectedGroups[corpus] && selectedGroupsCount < allGroupsCount) {
      // Only count words from selected groups (when not all groups are selected)
      return getSelectedGroupsWordCount(corpus);
    } else {
      // Count all words from all groups in the corpus
      return getAllGroupsWordCount(corpus);
    }
  };

  return (
    <div className="w-card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text)' }}>
          ⚡ Blitz Mode Setup
        </h2>
        <p style={{ margin: '0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Choose a vocabulary source for fast-paced practice with 8 words at a time
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Selection Mode Toggle */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 'bold',
            color: 'var(--color-text)'
          }}>
            🎯 Selection Mode:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--color-border)',
              background: selectionMode === 'corpus' ? 'var(--color-primary-light)' : 'var(--color-card-bg)',
              flex: 1,
              justifyContent: 'center'
            }}>
              <input
                type="radio"
                name="selectionMode"
                checked={selectionMode === 'corpus'}
                onChange={() => {
                  setSelectionMode('corpus');
                  setSelectedLevel('');
                }}
              />
              <span>📚 By Corpus</span>
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              cursor: levelsData && Object.keys(levelsData).length > 0 ? 'pointer' : 'not-allowed',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--color-border)',
              background: selectionMode === 'level' ? 'var(--color-primary-light)' : 'var(--color-card-bg)',
              opacity: levelsData && Object.keys(levelsData).length > 0 ? 1 : 0.6,
              flex: 1,
              justifyContent: 'center'
            }}>
              <input
                type="radio"
                name="selectionMode"
                checked={selectionMode === 'level'}
                disabled={!levelsData || Object.keys(levelsData).length === 0}
                onChange={() => {
                  setSelectionMode('level');
                  setSelectedCorpus('');
                }}
              />
              <span>🎚️ By Level</span>
            </label>
          </div>
        </div>

        {/* Corpus Selection Mode */}
        {selectionMode === 'corpus' && (
          <>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold',
                color: 'var(--color-text)'
              }}>
                📚 Vocabulary Source:
              </label>
              <select 
                value={selectedCorpus}
                onChange={(e) => setSelectedCorpus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-card-bg)',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select a vocabulary source...</option>
                {availableCorpora.map(corpus => {
                  const wordCount = getCorpusWordCount(corpus);
                  const displayName = corpus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  return (
                    <option key={corpus} value={corpus}>
                      {displayName} ({wordCount} words)
                    </option>
                  );
                })}
              </select>
              {selectedCorpus && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  fontSize: '0.85rem', 
                  color: 'var(--color-text-secondary)' 
                }}>
                  {getCorpusWordCount(selectedCorpus) >= 20 ? 
                    `✓ Ready for Blitz mode (${getCorpusWordCount(selectedCorpus)} words available)` :
                    `⚠️ Need at least 20 words for Blitz mode (only ${getCorpusWordCount(selectedCorpus)} available)`
                  }
                </div>
              )}
            </div>

            {/* Group Selection Option for Corpus Mode */}
            {selectedCorpus && (
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold',
                  color: 'var(--color-text)'
                }}>
                  📝 Word Selection:
                </label>
                {selectedGroups && selectedGroups[selectedCorpus] && selectedGroups[selectedCorpus].length > 0 ? (
                  selectedGroups[selectedCorpus].length === Object.keys(corporaData[selectedCorpus]?.groups || {}).length ? (
                    <div style={{ 
                      padding: '0.75rem',
                      borderRadius: 'var(--border-radius)',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-card-bg)',
                      fontSize: '0.9rem',
                      color: 'var(--color-text-secondary)'
                    }}>
                      All groups from this corpus are selected in Study Materials. Will use all available groups 
                      ({getAllGroupsWordCount(selectedCorpus)} words).
                    </div>
                  ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: 'var(--border-radius)',
                      border: '1px solid var(--color-border)',
                      background: !useSelectedGroupsOnly ? 'var(--color-primary-light)' : 'var(--color-card-bg)'
                    }}>
                      <input
                        type="radio"
                        name="groupSelection"
                        checked={!useSelectedGroupsOnly}
                        onChange={() => setUseSelectedGroupsOnly(false)}
                      />
                      <span>
                        Use all groups from Study Materials 
                        ({getAllGroupsWordCount(selectedCorpus)} words)
                      </span>
                    </label>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      cursor: getSelectedGroupsWordCount(selectedCorpus) >= 20 ? 'pointer' : 'not-allowed',
                      padding: '0.5rem',
                      borderRadius: 'var(--border-radius)',
                      border: '1px solid var(--color-border)',
                      background: useSelectedGroupsOnly ? 'var(--color-primary-light)' : 'var(--color-card-bg)',
                      opacity: getSelectedGroupsWordCount(selectedCorpus) >= 20 ? 1 : 0.6
                    }}>
                      <input
                        type="radio"
                        name="groupSelection"
                        checked={useSelectedGroupsOnly}
                        disabled={getSelectedGroupsWordCount(selectedCorpus) < 20}
                        onChange={() => setUseSelectedGroupsOnly(true)}
                      />
                      <span>
                        Use only selected groups from Study Materials 
                        ({getSelectedGroupsWordCount(selectedCorpus)} words)
                        {getSelectedGroupsWordCount(selectedCorpus) < 20 && (
                          <span style={{ color: 'var(--color-error)', marginLeft: '0.5rem' }}>
                            (Need at least 20 words)
                          </span>
                        )}
                      </span>
                    </label>
                  </div>
                  )
                ) : (
                  <div style={{ 
                    padding: '0.75rem',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-card-bg)',
                    fontSize: '0.9rem',
                    color: 'var(--color-text-secondary)'
                  }}>
                    No groups selected in Study Materials for this corpus. Will use all available groups by default 
                    ({getAllGroupsWordCount(selectedCorpus)} words).
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Level Selection Mode */}
        {selectionMode === 'level' && levelsData && Object.keys(levelsData).length > 0 && (
          <>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold',
                color: 'var(--color-text)'
              }}>
                🎚️ Study Level:
              </label>
              <select 
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-card-bg)',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select a level...</option>
                {organizeLevelsForDisplay(levelsData, availableCorpora, corporaData, selectedGroups).map(({ levelKey, level, description, totalWords }) => (
                  <option key={levelKey} value={levelKey}>
                    {level}: {description} ({totalWords} words)
                  </option>
                ))}
              </select>
              {selectedLevel && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  fontSize: '0.85rem', 
                  color: 'var(--color-text-secondary)' 
                }}>
                  {getCurrentWordCount() >= 20 ? 
                    `✓ Ready for Blitz mode (${getCurrentWordCount()} words available)` :
                    `⚠️ Need at least 20 words for Blitz mode (only ${getCurrentWordCount()} available)`
                  }
                </div>
              )}
            </div>

            {/* Content Filter for Level Mode */}
            {selectedLevel && levelHasMixedContent(selectedLevel) && (
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold',
                  color: 'var(--color-text)'
                }}>
                  📝 Content Type:
                </label>
                <div style={{ 
                  padding: '0.5rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--color-warning)',
                  background: 'var(--color-warning-light)',
                  fontSize: '0.85rem',
                  color: 'var(--color-text)',
                  marginBottom: '0.5rem'
                }}>
                  ⚠️ This level contains mixed content types (individual words and verb phrases). Choose what to practice:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--color-border)',
                    background: contentFilter === 'all' ? 'var(--color-primary-light)' : 'var(--color-card-bg)'
                  }}>
                    <input
                      type="radio"
                      name="contentFilter"
                      checked={contentFilter === 'all'}
                      onChange={() => setContentFilter('all')}
                    />
                    <span>
                      All content types ({getLevelWordCount(selectedLevel, 'all')} words)
                    </span>
                  </label>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    cursor: getLevelWordCount(selectedLevel, 'words') >= 20 ? 'pointer' : 'not-allowed',
                    padding: '0.5rem',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--color-border)',
                    background: contentFilter === 'words' ? 'var(--color-primary-light)' : 'var(--color-card-bg)',
                    opacity: getLevelWordCount(selectedLevel, 'words') >= 20 ? 1 : 0.6
                  }}>
                    <input
                      type="radio"
                      name="contentFilter"
                      checked={contentFilter === 'words'}
                      disabled={getLevelWordCount(selectedLevel, 'words') < 20}
                      onChange={() => setContentFilter('words')}
                    />
                    <span>
                      Individual words only ({getLevelWordCount(selectedLevel, 'words')} words)
                      {getLevelWordCount(selectedLevel, 'words') < 20 && (
                        <span style={{ color: 'var(--color-error)', marginLeft: '0.5rem' }}>
                          (Need at least 20)
                        </span>
                      )}
                    </span>
                  </label>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    cursor: getLevelWordCount(selectedLevel, 'verbs') >= 20 ? 'pointer' : 'not-allowed',
                    padding: '0.5rem',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--color-border)',
                    background: contentFilter === 'verbs' ? 'var(--color-primary-light)' : 'var(--color-card-bg)',
                    opacity: getLevelWordCount(selectedLevel, 'verbs') >= 20 ? 1 : 0.6
                  }}>
                    <input
                      type="radio"
                      name="contentFilter"
                      checked={contentFilter === 'verbs'}
                      disabled={getLevelWordCount(selectedLevel, 'verbs') < 20}
                      onChange={() => setContentFilter('verbs')}
                    />
                    <span>
                      Verb phrases only ({getLevelWordCount(selectedLevel, 'verbs')} words)
                      {getLevelWordCount(selectedLevel, 'verbs') < 20 && (
                        <span style={{ color: 'var(--color-error)', marginLeft: '0.5rem' }}>
                          (Need at least 20)
                        </span>
                      )}
                    </span>
                  </label>
                </div>
              </div>
            )}
          </>
        )}

        {/* Info Box */}
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--color-primary-light)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-primary)',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
            ⚡ How Blitz Mode Works:
          </div>
          <ul style={{ 
            margin: '0', 
            paddingLeft: '1.2rem', 
            color: 'var(--color-text-secondary)',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}>
            <li>8 words are displayed as answer choices</li>
            <li>You'll be asked about one word at a time</li>
            <li>Choose the correct answer from the 8 options</li>
            <li>Words are replaced as you progress through the game</li>
            <li>Up to 25 questions or half the available words, whichever is smaller</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          marginTop: '1rem'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-card-bg)',
              color: 'var(--color-text)',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.background = 'var(--color-background)';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.background = 'var(--color-card-bg)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleStartBlitz}
            disabled={!isStartEnabled || getCurrentWordCount() < 20}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: 'var(--border-radius)',
              border: 'none',
              background: (isStartEnabled && getCurrentWordCount() >= 20) ? 'var(--color-primary)' : 'var(--color-border)',
              color: (isStartEnabled && getCurrentWordCount() >= 20) ? 'white' : 'var(--color-text-secondary)',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: (isStartEnabled && getCurrentWordCount() >= 20) ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (isStartEnabled && getCurrentWordCount() >= 20) {
                (e.target as HTMLButtonElement).style.background = 'var(--color-primary-dark)';
              }
            }}
            onMouseOut={(e) => {
              if (isStartEnabled && getCurrentWordCount() >= 20) {
                (e.target as HTMLButtonElement).style.background = 'var(--color-primary)';
              }
            }}
          >
            ⚡ Start Blitz
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlitzModeSelector;