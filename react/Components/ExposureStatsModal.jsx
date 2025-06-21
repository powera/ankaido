import React, { useState, useEffect } from 'react';
import BaseModal from './shared/BaseModal';
import DataTable from './shared/DataTable';
import journeyStatsManager, { convertStatsToDisplayArray, formatDate } from '../journeyStatsManager';
import safeStorage from '../safeStorage';

const ExposureStatsModal = ({
  isOpen,
  onClose
}) => {
  const [sortField, setSortField] = useState('lastSeen');
  const [sortDirection, setSortDirection] = useState('desc');
  const [exposedWords, setExposedWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [journeyStats, setJourneyStats] = useState({});

  // Load journey stats when modal opens
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

          if (wordsArray.length === 0) {
            console.warn('No journey stats available or empty object');
          }
        } catch (error) {
          console.error('Error loading journey stats in ExposureStatsModal:', error);
          setExposedWords([]);
        } finally {
          setLoading(false);
        }
      };

      loadStats();
    }
  }, [isOpen]);

  // Sort the exposed words based on current sort settings
  const sortedWords = [...exposedWords].sort((a, b) => {
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
      case 'totalCorrect':
        aValue = a.totalCorrect;
        bValue = b.totalCorrect;
        break;
      case 'totalIncorrect':
        aValue = a.totalIncorrect;
        bValue = b.totalIncorrect;
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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Exposure Statistics (${exposedWords.length} words)`}
      width="90%"
      maxWidth="900px"
      ariaLabel="Exposure statistics"
    >
      <div className="w-settings-form" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div>Loading journey statistics...</div>
          </div>
        ) : exposedWords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div>No journey statistics available yet.</div>
            <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Start practicing in Journey Mode to see your progress here!
            </div>
          </div>
        ) : (
          <DataTable
            columns={[
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
                accessor: 'totalCorrect',
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
                accessor: 'totalIncorrect',
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
                accessor: 'lastSeen',
                align: 'center',
                render: (word) => {
                  if (!word.lastSeen) return 'Never';
                  const date = new Date(word.lastSeen);
                  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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