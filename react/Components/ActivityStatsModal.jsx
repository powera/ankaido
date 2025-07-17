import React, { useState, useEffect } from 'react';
import BaseModal from './shared/BaseModal';
import DataTable from './shared/DataTable';
import { 
  activityStatsManager, 
  convertStatsToDisplayArray, 
  formatDate 
} from '../Managers/activityStatsManager';
import { fetchDailyStats, fetchLevels } from '../Utilities/apiClient';
import { addLevelToWords } from '../Utilities/levelUtils';
import safeStorage from '../DataStorage/safeStorage';

const ActivityStatsModal = ({
  isOpen,
  onClose,
  corporaData = {},
  selectedGroups = {}
}) => {
  const [sortField, setSortField] = useState('lastSeen');
  const [sortDirection, setSortDirection] = useState('desc');
  const [exposedWords, setExposedWords] = useState([]);
  const [unexposedWords, setUnexposedWords] = useState([]);
  const [dailyStats, setDailyStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activityStats, setActivityStats] = useState({});
  const [viewMode, setViewMode] = useState('exposed'); // 'exposed', 'unexposed', or 'daily'
  const [levelsData, setLevelsData] = useState({});

  // Helper function to get words from selected groups only
  const getAllWordsFromSelectedGroups = () => {
    const allWords = [];
    Object.entries(selectedGroups).forEach(([corpus, groups]) => {
      if (corporaData[corpus] && groups.length > 0) {
        groups.forEach(group => {
          if (corporaData[corpus].groups[group]) {
            const groupWords = corporaData[corpus].groups[group].map(word => ({
              ...word,
              corpus,
              group
            }));
            allWords.push(...groupWords);
          }
        });
      }
    });
    return allWords;
  };

  // Load journey stats, unexposed words, and daily stats when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadStats = async () => {
        setLoading(true);
        try {
          // Load levels data first
          const levelsDataResult = await fetchLevels();
          console.log('ActivityStatsModal received levels data:', levelsDataResult);
          setLevelsData(levelsDataResult);

          // Load activity stats
          await activityStatsManager.initialize();
          const stats = activityStatsManager.getAllStats();
          console.log('ActivityStatsModal loaded activityStats:', stats);
          setActivityStats(stats);

          const wordsArray = convertStatsToDisplayArray(stats);
          setExposedWords(wordsArray);

          // Get all words from selected study materials
          const allWords = getAllWordsFromSelectedGroups();
          
          // Filter unexposed words (words that exist in study materials but aren't exposed)
          const unexposed = allWords.filter(word => {
            const wordKey = `${word.lithuanian}-${word.english}`;
            const wordStats = stats[wordKey];
            return !wordStats || !wordStats.exposed;
          });

          // Add level information to unexposed words
          const unexposedWithLevel = addLevelToWords(unexposed.map(word => ({
            lithuanian: word.lithuanian,
            english: word.english,
            corpus: word.corpus,
            group: word.group
          })), levelsDataResult);

          setUnexposedWords(unexposedWithLevel);

          // Load daily stats
          const dailyStatsData = await fetchDailyStats();
          setDailyStats(dailyStatsData);

          if (wordsArray.length === 0) {
            console.warn('No activity stats available or empty object');
          }
        } catch (error) {
          console.error('Error loading activity stats in ActivityStatsModal:', error);
          setExposedWords([]);
          setUnexposedWords([]);
          setDailyStats(null);
        } finally {
          setLoading(false);
        }
      };

      loadStats();
    }
  }, [isOpen, corporaData, selectedGroups]);

  // Get current words based on view mode
  const currentWords = viewMode === 'exposed' ? exposedWords : 
                      viewMode === 'unexposed' ? unexposedWords : 
                      []; // Daily stats doesn't use the words array

  // Sort the current words based on current sort settings
  const sortedWords = [...currentWords].sort((a, b) => {
    let aValue, bValue;

    // Handle different sort fields
    switch (sortField) {
      case 'lithuanian':
        aValue = a.lithuanian.toLowerCase();
        bValue = b.lithuanian.toLowerCase();
        break;
      case 'english':
        aValue = a.english.toLowerCase();
        bValue = b.english.toLowerCase();
        break;
      case 'corpus':
        aValue = a.corpus?.toLowerCase() || '';
        bValue = b.corpus?.toLowerCase() || '';
        break;
      case 'level':
        aValue = a.level?.toLowerCase() || '';
        bValue = b.level?.toLowerCase() || '';
        break;
      case 'totalCorrect':
        aValue = a.totalCorrect || 0;
        bValue = b.totalCorrect || 0;
        break;
      case 'totalIncorrect':
        aValue = a.totalIncorrect || 0;
        bValue = b.totalIncorrect || 0;
        break;
      case 'lastSeen':
      default:
        aValue = a.lastSeen || 0;
        bValue = b.lastSeen || 0;
        break;
    }

    // Apply sort direction
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Handle sorting when column header is clicked
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Handle view mode change
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
    // Reset sort to appropriate default for each mode
    if (newMode === 'exposed') {
      setSortField('lastSeen');
      setSortDirection('desc');
    } else if (newMode === 'unexposed') {
      setSortField('corpus');
      setSortDirection('asc');
    }
    // Daily stats doesn't need sorting
  };

  // Get modal title based on current mode
  const getModalTitle = () => {
    if (viewMode === 'exposed') {
      return `Exposed Words (${exposedWords.length} words)`;
    } else if (viewMode === 'unexposed') {
      return `Unexposed Words (${unexposedWords.length} words)`;
    } else {
      return `Daily Stats${dailyStats ? ` - ${dailyStats.day}` : ''}`;
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      width="90%"
      maxWidth="900px"
      ariaLabel="Activity statistics"
    >
      <div className="w-settings-form" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* View Mode Toggle Buttons */}
        <div style={{ 
          marginBottom: 'var(--spacing-base)', 
          display: 'flex', 
          gap: 'var(--spacing-small)',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => handleViewModeChange('exposed')}
            className={`w-settings-button ${viewMode === 'exposed' ? 'w-settings-button-primary' : 'w-settings-button-secondary'}`}
            style={{ minWidth: '120px' }}
          >
            Exposed Words
          </button>
          <button
            onClick={() => handleViewModeChange('unexposed')}
            className={`w-settings-button ${viewMode === 'unexposed' ? 'w-settings-button-primary' : 'w-settings-button-secondary'}`}
            style={{ minWidth: '120px' }}
          >
            Unexposed Words
          </button>
          <button
            onClick={() => handleViewModeChange('daily')}
            className={`w-settings-button ${viewMode === 'daily' ? 'w-settings-button-primary' : 'w-settings-button-secondary'}`}
            style={{ minWidth: '120px' }}
          >
            Daily Stats
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div>Loading activity statistics...</div>
          </div>
        ) : viewMode === 'daily' ? (
          // Daily Stats View
          <div style={{ padding: '1rem' }}>
            {dailyStats ? (
              <div>
                <div style={{ 
                  textAlign: 'center', 
                  marginBottom: '2rem',
                  fontSize: '1.2rem',
                  fontWeight: 'bold'
                }}>
                  Today's Progress - {dailyStats.day}
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  {Object.entries(dailyStats.progress).map(([activityType, stats]) => {
                    const total = stats.correct + stats.incorrect;
                    const accuracy = total > 0 ? ((stats.correct / total) * 100).toFixed(1) : 0;
                    
                    // Activity type display names and colors
                    const activityConfig = {
                      'listeningEasy': { name: '🎧 Listening (Easy)', color: '#9C27B0' },
                      'listeningHard': { name: '🎧 Listening (Hard)', color: '#7B1FA2' },
                      'multipleChoice': { name: '🎯 Multiple Choice', color: '#2196F3' },
                      'typing': { name: '⌨️ Typing', color: '#FF9800' }
                    };
                    
                    const config = activityConfig[activityType] || { name: activityType, color: '#666' };
                    
                    return (
                      <div key={activityType} style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        padding: '1rem',
                        backgroundColor: 'var(--color-background-secondary)',
                        borderLeft: `4px solid ${config.color}`
                      }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          marginBottom: '0.5rem',
                          color: config.color
                        }}>
                          {config.name}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>Correct:</span>
                          <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>{stats.correct}</span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>Incorrect:</span>
                          <span style={{ fontWeight: 'bold', color: '#f44336' }}>{stats.incorrect}</span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>Total:</span>
                          <span style={{ fontWeight: 'bold' }}>{total}</span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Accuracy:</span>
                          <span style={{ 
                            fontWeight: 'bold',
                            color: accuracy >= 80 ? '#4CAF50' : accuracy >= 60 ? '#FF9800' : '#f44336'
                          }}>
                            {accuracy}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Overall Summary */}
                {Object.keys(dailyStats.progress).length > 0 && (
                  <div style={{
                    border: '2px solid var(--color-primary)',
                    borderRadius: '8px',
                    padding: '1rem',
                    backgroundColor: 'var(--color-background-secondary)',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '1rem',
                      fontSize: '1.1rem',
                      color: 'var(--color-primary)'
                    }}>
                      📊 Daily Summary
                    </div>
                    
                    {(() => {
                      const totalCorrect = Object.values(dailyStats.progress).reduce((sum, stats) => sum + stats.correct, 0);
                      const totalIncorrect = Object.values(dailyStats.progress).reduce((sum, stats) => sum + stats.incorrect, 0);
                      const grandTotal = totalCorrect + totalIncorrect;
                      const overallAccuracy = grandTotal > 0 ? ((totalCorrect / grandTotal) * 100).toFixed(1) : 0;
                      
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem' }}>
                          <div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4CAF50' }}>{totalCorrect}</div>
                            <div>Correct</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f44336' }}>{totalIncorrect}</div>
                            <div>Incorrect</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{grandTotal}</div>
                            <div>Total</div>
                          </div>
                          <div>
                            <div style={{ 
                              fontSize: '2rem', 
                              fontWeight: 'bold',
                              color: overallAccuracy >= 80 ? '#4CAF50' : overallAccuracy >= 60 ? '#FF9800' : '#f44336'
                            }}>
                              {overallAccuracy}%
                            </div>
                            <div>Accuracy</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div>No daily statistics available for today.</div>
                <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  Start practicing in Journey Mode to see your daily progress here!
                </div>
              </div>
            )}
          </div>
        ) : sortedWords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            {viewMode === 'exposed' ? (
              <>
                <div>No journey statistics available yet.</div>
                <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  Start practicing in Journey Mode to see your progress here!
                </div>
              </>
            ) : (
              <>
                <div>All words from your study materials have been exposed!</div>
                <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  Great job! You've practiced all available words.
                </div>
              </>
            )}
          </div>
        ) : (
          <DataTable
            columns={viewMode === 'exposed' ? [
              {
                header: 'Lithuanian',
                accessor: 'lithuanian'
              },
              {
                header: 'English',
                accessor: 'english'
              },
              {
                header: 'Correct',
                sortKey: 'totalCorrect',
                align: 'center',
                render: (word) => (
                  <div>
                    <div>Total: {word.totalCorrect}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      MC: {word.multipleChoice?.correct || 0} | 
                      Listen Easy: {word.listeningEasy?.correct || 0} | 
                      Listen Hard: {word.listeningHard?.correct || 0} | 
                      Type: {word.typing?.correct || 0}
                    </div>
                  </div>
                )
              },
              {
                header: 'Incorrect',
                sortKey: 'totalIncorrect',
                align: 'center',
                render: (word) => (
                  <div>
                    <div>Total: {word.totalIncorrect}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      MC: {word.multipleChoice?.incorrect || 0} | 
                      Listen Easy: {word.listeningEasy?.incorrect || 0} | 
                      Listen Hard: {word.listeningHard?.incorrect || 0} | 
                      Type: {word.typing?.incorrect || 0}
                    </div>
                  </div>
                )
              },
              {
                header: 'Last Seen',
                sortKey: 'lastSeen',
                align: 'center',
                render: (word) => {
                  if (!word.lastSeen) return 'Never';
                  return formatDate(word.lastSeen);
                }
              }
            ] : [
              {
                header: 'Lithuanian',
                accessor: 'lithuanian'
              },
              {
                header: 'English',
                accessor: 'english'
              },
              {
                header: 'Corpus',
                sortKey: 'corpus',
                align: 'center',
                render: (word) => (
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{word.corpus}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {word.group}
                    </div>
                  </div>
                )
              },
              {
                header: 'Level',
                sortKey: 'level',
                align: 'center',
                render: (word) => (
                  <div style={{ 
                    fontWeight: 'bold',
                    color: word.level === 'Other' ? 'var(--color-text-muted)' : 'var(--color-primary)'
                  }}>
                    {word.level}
                  </div>
                )
              }
            ]}
            data={sortedWords}
            sortable={true}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            maxHeight="70vh"
            stickyHeader={true}
            striped={true}
          />
        )}
      </div>

      <div className="w-settings-actions">
        <button
          onClick={onClose}
          className="w-settings-button w-settings-button-primary"
        >
          Close
        </button>
      </div>
    </BaseModal>
  );
};

export default ActivityStatsModal;