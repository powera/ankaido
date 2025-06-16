import React, { useState, useRef, useEffect } from 'react';
import indexedDBManager from '../indexedDBManager';
import safeStorage from '../safeStorage';

const ExposureStatsModal = ({
  isOpen,
  onClose
}) => {
  const modalRef = useRef(null);
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
          const stats = await indexedDBManager.loadJourneyStats(safeStorage);
          console.log('ExposureStatsModal loaded journeyStats:', stats);
          setJourneyStats(stats);
          
          if (stats && Object.keys(stats).length > 0) {
            const wordsArray = Object.entries(stats).map(([key, wordStats]) => {
              const [lithuanian, english] = key.split('-');
              return {
                lithuanian,
                english,
                ...wordStats,
                totalCorrect: (wordStats.multipleChoice?.correct || 0) + 
                              (wordStats.listening?.correct || 0) + 
                              (wordStats.typing?.correct || 0),
                totalIncorrect: (wordStats.multipleChoice?.incorrect || 0) + 
                                (wordStats.listening?.incorrect || 0) + 
                                (wordStats.typing?.incorrect || 0)
              };
            });
            setExposedWords(wordsArray);
          } else {
            console.warn('No journey stats available or empty object');
            setExposedWords([]);
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

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
      <div ref={modalRef} className="w-settings-modal" style={{ width: '90%', maxWidth: '900px' }}>
        <div className="w-settings-header">
          <h2 className="w-settings-title">Exposure Statistics ({exposedWords.length} words)</h2>
          <button
            onClick={onClose}
            className="w-settings-close"
            aria-label="Close exposure stats"
          >
            ×
          </button>
        </div>

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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ 
                position: 'sticky', 
                top: 0, 
                background: 'var(--color-card-bg)', 
                zIndex: 1,
                borderBottom: '1px solid var(--color-border)'
              }}>
                <th 
                  onClick={() => handleSort('lithuanian')}
                  style={{ 
                    padding: '0.5rem', 
                    textAlign: 'left', 
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  Lithuanian {sortField === 'lithuanian' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('english')}
                  style={{ 
                    padding: '0.5rem', 
                    textAlign: 'left', 
                    cursor: 'pointer' 
                  }}
                >
                  English {sortField === 'english' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('totalCorrect')}
                  style={{ 
                    padding: '0.5rem', 
                    textAlign: 'center', 
                    cursor: 'pointer' 
                  }}
                >
                  Correct {sortField === 'totalCorrect' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('totalIncorrect')}
                  style={{ 
                    padding: '0.5rem', 
                    textAlign: 'center', 
                    cursor: 'pointer' 
                  }}
                >
                  Incorrect {sortField === 'totalIncorrect' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('lastSeen')}
                  style={{ 
                    padding: '0.5rem', 
                    textAlign: 'center', 
                    cursor: 'pointer' 
                  }}
                >
                  Last Seen {sortField === 'lastSeen' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedWords.map((word, index) => (
                <tr 
                  key={`${word.lithuanian}-${word.english}`}
                  style={{ 
                    background: index % 2 === 0 ? 'var(--color-card-bg)' : 'var(--color-bg)',
                    borderBottom: '1px solid var(--color-border)'
                  }}
                >
                  <td style={{ padding: '0.5rem' }}>{word.lithuanian}</td>
                  <td style={{ padding: '0.5rem' }}>{word.english}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <div>Total: {word.totalCorrect}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      MC: {word.multipleChoice?.correct || 0} | 
                      Listen: {word.listening?.correct || 0} | 
                      Type: {word.typing?.correct || 0}
                    </div>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <div>Total: {word.totalIncorrect}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      MC: {word.multipleChoice?.incorrect || 0} | 
                      Listen: {word.listening?.incorrect || 0} | 
                      Type: {word.typing?.incorrect || 0}
                    </div>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    {formatDate(word.lastSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      </div>
    </div>
  );
};

export default ExposureStatsModal;