import { useEffect, useState } from 'react';
import {
    activityStatsManager,
    convertStatsToDisplayArray,
    formatDate
} from '../Managers/activityStatsManager';
import journeyModeManager from '../Managers/journeyModeManager';
import { fetchDailyStats, fetchWeeklyStats } from '../Utilities/apiClient';
import BaseModal from './shared/BaseModal';
import DataTable from './shared/DataTable';

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
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activityStats, setActivityStats] = useState({});
  const [viewMode, setViewMode] = useState('exposed'); // 'exposed', 'unexposed', 'daily', or 'weekly'


  const [queueSize, setQueueSize] = useState(0);
  const [isQueueFull, setIsQueueFull] = useState(false);

  // Helper function to convert levels array to display string
  const formatLevelsForDisplay = (levels) => {
    if (!levels || levels.length === 0) return 'Other';
    if (levels.length === 1) {
      const levelNum = levels[0].replace('level_', '');
      return `Level ${levelNum}`;
    }
    // For multiple levels, show the range or list
    const levelNums = levels.map(level => level.replace('level_', '')).sort((a, b) => parseInt(a) - parseInt(b));
    return `Levels ${levelNums.join(', ')}`;
  };

  // Helper function to get words from selected groups only
  const getAllWordsFromSelectedGroups = () => {
    const allWords = [];
    Object.entries(selectedGroups).forEach(([corpus, groups]) => {
      if (corporaData[corpus] && groups.length > 0) {
        groups.forEach(group => {
          if (corporaData[corpus].groups[group]) {
            const groupWords = corporaData[corpus].groups[group].map(word => ({
              ...word,
              level: formatLevelsForDisplay(word.levels)
            }));
            allWords.push(...groupWords);
          }
        });
      }
    });
    return allWords;
  };

  // Helper function to check if a progress entry is an activity progress (has correct/incorrect)
  const isActivityProgress = (stats) => {
    return stats && typeof stats.correct === 'number' && typeof stats.incorrect === 'number';
  };

  // Helper function to check if a progress entry is an exposed progress (has new/total)
  const isExposedProgress = (stats) => {
    return stats && typeof stats.new === 'number' && typeof stats.total === 'number';
  };

  // Load journey stats, unexposed words, and daily stats when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadStats = async () => {
        setLoading(true);
        try {
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

          // Format levels for display
          const unexposedWithFormattedLevels = unexposed.map(word => ({
            ...word,
            level: formatLevelsForDisplay(word.levels)
          }));
          setUnexposedWords(unexposedWithFormattedLevels);

          // Load daily stats
          const dailyStatsData = await fetchDailyStats();
          setDailyStats(dailyStatsData);

          // Load weekly stats
          const weeklyStatsData = await fetchWeeklyStats();
          setWeeklyStats(weeklyStatsData);

          if (wordsArray.length === 0) {
            console.warn('No activity stats available or empty object');
          }
        } catch (error) {
          console.error('Error loading activity stats in ActivityStatsModal:', error);
          setExposedWords([]);
          setUnexposedWords([]);
          setDailyStats(null);
          setWeeklyStats(null);
        } finally {
          setLoading(false);
        }
      };

      loadStats();
    }
  }, [isOpen, corporaData, selectedGroups]);

  // Monitor Journey Mode queue status
  useEffect(() => {
    const updateJourneyModeStatus = () => {
      setQueueSize(journeyModeManager.getQueueSize());
      setIsQueueFull(journeyModeManager.isQueueFull());
    };

    // Initial check
    updateJourneyModeStatus();

    // Listen for changes
    journeyModeManager.addListener(updateJourneyModeStatus);

    // Cleanup
    return () => {
      journeyModeManager.removeListener(updateJourneyModeStatus);
    };
  }, []);

  // Handler for adding word to Journey Mode queue
  const handleAddToJourneyQueue = (word) => {
    const success = journeyModeManager.addWordToQueue(word);
    if (success) {
      console.log(`Added "${word.lithuanian}" to Journey Mode queue (${journeyModeManager.getQueueSize()}/10)`);
    } else {
      if (journeyModeManager.isQueueFull()) {
        console.warn('Journey Mode queue is full (10/10)');
      } else if (journeyModeManager.isWordInQueue(word)) {
        console.warn(`"${word.lithuanian}" is already in the queue`);
      }
    }
  };

  // Helper function to get button state for a word
  const getButtonState = (word) => {
    if (isQueueFull) {
      return { disabled: true, text: '🚀 Queue Full', title: 'Queue is full (10/10). Study some words first!' };
    }
    if (journeyModeManager.isWordInQueue(word)) {
      return { disabled: true, text: '✓ In Queue', title: 'Word is already in the queue' };
    }
    return { disabled: false, text: '🚀 Add to Queue', title: 'Add to Journey Mode queue' };
  };

  // Get current words based on view mode
  const currentWords = viewMode === 'exposed' ? exposedWords : 
                      viewMode === 'unexposed' ? unexposedWords : 
                      []; // Daily and weekly stats don't use the words array

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
    // Daily and weekly stats don't need sorting
  };

  // Get modal title based on current mode
  const getModalTitle = () => {
    if (viewMode === 'exposed') {
      return `Exposed Words (${exposedWords.length} words)`;
    } else if (viewMode === 'unexposed') {
      return `Unexposed Words (${unexposedWords.length} words)`;
    } else if (viewMode === 'daily') {
      return `Daily Stats${dailyStats ? ` - ${dailyStats.currentDay}` : ''}`;
    } else if (viewMode === 'weekly') {
      return `Weekly Stats${weeklyStats ? ` - ${weeklyStats.currentDay}` : ''}`;
    }
    return 'Activity Stats';
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
          <button
            onClick={() => handleViewModeChange('weekly')}
            className={`w-settings-button ${viewMode === 'weekly' ? 'w-settings-button-primary' : 'w-settings-button-secondary'}`}
            style={{ minWidth: '120px' }}
          >
            Weekly Stats
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div>Loading activity statistics...</div>
          </div>
        ) : viewMode === 'daily' || viewMode === 'weekly' ? (
          // Daily/Weekly Stats View
          <div style={{ padding: '1rem' }}>
            {(() => {
              const currentStats = viewMode === 'daily' ? dailyStats : weeklyStats;
              return currentStats ? (
                <div>
                <div style={{ 
                  textAlign: 'center', 
                  marginBottom: '2rem',
                  fontSize: '1.2rem',
                  fontWeight: 'bold'
                }}>
                  {viewMode === 'daily' ? 'Today\'s' : 'This Week\'s'} Progress - {currentStats.currentDay}
                </div>

                {/* Overall Summary - moved before detailed stats */}
                {Object.keys(currentStats.progress).length > 0 && (
                  <div style={{
                    border: '2px solid var(--color-primary)',
                    borderRadius: '8px',
                    padding: '1rem',
                    backgroundColor: 'var(--color-background-secondary)',
                    textAlign: 'center',
                    marginBottom: '2rem'
                  }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '1rem',
                      fontSize: '1.1rem',
                      color: 'var(--color-primary)'
                    }}>
                      📊 {viewMode === 'daily' ? 'Daily' : 'Weekly'} Summary
                    </div>
                    
                    {(() => {
                      // Only include activity progress entries in the summary (not exposed progress)
                      const activityEntries = Object.values(currentStats.progress).filter(isActivityProgress);
                      const totalCorrect = activityEntries.reduce((sum, stats) => sum + stats.correct, 0);
                      const totalIncorrect = activityEntries.reduce((sum, stats) => sum + stats.incorrect, 0);
                      const grandTotal = totalCorrect + totalIncorrect;
                      const overallAccuracy = grandTotal > 0 ? ((totalCorrect / grandTotal) * 100).toFixed(1) : 0;
                      
                      const exposedStats = currentStats.progress.exposed;
                      
                      return (
                        <div>
                          {/* Activity Summary */}
                          {grandTotal > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem', marginBottom: exposedStats ? '1.5rem' : '0' }}>
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
                          )}
                          
                          {/* Exposed Words Summary */}
                          {exposedStats && (
                            <div style={{ 
                              borderTop: grandTotal > 0 ? '1px solid var(--color-border)' : 'none',
                              paddingTop: grandTotal > 0 ? '1rem' : '0',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50', marginBottom: '0.5rem' }}>
                                📚 {exposedStats.new} New Word{exposedStats.new !== 1 ? 's' : ''} Exposed {viewMode === 'daily' ? 'Today' : 'This Week'}
                              </div>
                              <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>
                                Total vocabulary: {exposedStats.total} words
                              </div>
                            </div>
                          )}
                          
                          {/* No activity message */}
                          {grandTotal === 0 && !exposedStats && (
                            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                              No activity recorded {viewMode === 'daily' ? 'today' : 'this week'}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  {Object.entries(currentStats.progress)
                    .sort(([a], [b]) => {
                      // Always put 'exposed' first
                      if (a === 'exposed') return -1;
                      if (b === 'exposed') return 1;
                      return a.localeCompare(b);
                    })
                    .map(([activityType, stats]) => {
                    // Activity type display names and colors
                    const activityConfig = {
                      'exposed': { name: '📚 Words Exposed', color: '#4CAF50' },
                      'blitz': { name: '⚡ Blitz Mode', color: '#FF5722' },
                      'listeningEasy': { name: '🎧 Listening (Easy)', color: '#9C27B0' },
                      'listeningHard': { name: '🎧 Listening (Hard)', color: '#7B1FA2' },
                      'multipleChoice': { name: '🎯 Multiple Choice', color: '#2196F3' },
                      'typing': { name: '⌨️ Typing', color: '#FF9800' }
                    };
                    
                    const config = activityConfig[activityType] || { name: activityType, color: '#666' };
                    
                    // Handle different types of progress data
                    if (isExposedProgress(stats)) {
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
                            <span>New {viewMode === 'daily' ? 'Today' : 'This Week'}:</span>
                            <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>{stats.new}</span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Total Exposed:</span>
                            <span style={{ fontWeight: 'bold', color: config.color }}>{stats.total}</span>
                          </div>
                        </div>
                      );
                    } else if (isActivityProgress(stats)) {
                      const total = stats.correct + stats.incorrect;
                      const accuracy = total > 0 ? ((stats.correct / total) * 100).toFixed(1) : 0;
                      
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
                    } else {
                      // Fallback for unknown data structure
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
                          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                            Unknown data format
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div>No {viewMode} statistics available.</div>
                  <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    Start practicing in Journey Mode to see your {viewMode} progress here!
                  </div>
                </div>
              );
            })()}
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
          <>
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
              },
              {
                header: 'Actions',
                align: 'center',
                render: (word) => {
                  const buttonState = getButtonState(word);
                  return (
                    <button
                      onClick={() => handleAddToJourneyQueue(word)}
                      disabled={buttonState.disabled}
                      className="w-settings-button w-settings-button-secondary"
                      style={{ 
                        fontSize: '0.8rem',
                        padding: '0.25rem 0.5rem',
                        opacity: buttonState.disabled ? 0.5 : 1,
                        cursor: buttonState.disabled ? 'not-allowed' : 'pointer'
                      }}
                      title={buttonState.title}
                    >
                      {buttonState.text}
                    </button>
                  );
                }
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
          </>
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