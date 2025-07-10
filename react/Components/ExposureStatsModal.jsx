import React, { useState, useEffect } from 'react';
import BaseModal from './shared/BaseModal';
import DataTable from './shared/DataTable';
import { 
  journeyStatsManager, 
  convertStatsToDisplayArray, 
  formatDate 
} from '../Managers/journeyStatsManager';
import safeStorage from '../DataStorage/safeStorage';

const ExposureStatsModal = ({
  isOpen,
  onClose,
  corporaData = {},
  selectedGroups = {}
}) => {
  const [sortField, setSortField] = useState('lastSeen');
  const [sortDirection, setSortDirection] = useState('desc');
  const [exposedWords, setExposedWords] = useState([]);
  const [unexposedWords, setUnexposedWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [journeyStats, setJourneyStats] = useState({});
  const [viewMode, setViewMode] = useState('exposed'); // 'exposed' or 'unexposed'

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

  // Load journey stats and unexposed words when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadStats = async () => {
        setLoading(true);
        try {
          await journeyStatsManager.initialize();
          const stats = journeyStatsManager.getAllStats();
          console.log('ExposureStatsModal loaded journeyStats:', stats);
          setJourneyStats(stats);

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

          // Group unexposed words by corpus
          const unexposedWithCorpus = unexposed.map(word => ({
            lithuanian: word.lithuanian,
            english: word.english,
            corpus: word.corpus,
            group: word.group
          }));

          setUnexposedWords(unexposedWithCorpus);

          if (wordsArray.length === 0) {
            console.warn('No journey stats available or empty object');
          }
        } catch (error) {
          console.error('Error loading journey stats in ExposureStatsModal:', error);
          setExposedWords([]);
          setUnexposedWords([]);
        } finally {
          setLoading(false);
        }
      };

      loadStats();
    }
  }, [isOpen, corporaData, selectedGroups]);

  // Get current words based on view mode
  const currentWords = viewMode === 'exposed' ? exposedWords : unexposedWords;

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
    } else {
      setSortField('corpus');
      setSortDirection('asc');
    }
  };

  // Get modal title based on current mode
  const getModalTitle = () => {
    if (viewMode === 'exposed') {
      return `Exposed Words (${exposedWords.length} words)`;
    } else {
      return `Unexposed Words (${unexposedWords.length} words)`;
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      width="90%"
      maxWidth="900px"
      ariaLabel="Exposure statistics"
    >
      <div className="w-settings-form" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* View Mode Toggle Buttons */}
        <div style={{ 
          marginBottom: 'var(--spacing-base)', 
          display: 'flex', 
          gap: 'var(--spacing-small)',
          justifyContent: 'center'
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
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div>Loading journey statistics...</div>
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

export default ExposureStatsModal;