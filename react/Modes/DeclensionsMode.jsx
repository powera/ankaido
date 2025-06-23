
import React, { useState, useEffect } from 'react';
import DeclensionTable from '../Components/DeclensionTable';

// Use the namespaced lithuanianApi from window
const { fetchDeclensions } = window.lithuanianApi;

const DeclensionsMode = ({
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd
}) => {
  // Internal state for declensions mode
  const [selectedNoun, setSelectedNoun] = useState(null);
  const [availableNouns, setAvailableNouns] = useState([]);
  const [declensions, setDeclensions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const declensionData = await fetchDeclensions();
        setDeclensions(declensionData.declensions);
        setAvailableNouns(declensionData.available_nouns);
      } catch (err) {
        console.error('Failed to load declensions data:', err);
        setError('Failed to load declensions data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  if (loading) {
    return (
      <div className="w-card">
        <h3>Lithuanian Noun Declensions</h3>
        <div>Loading declensions data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-card">
        <h3>Lithuanian Noun Declensions</h3>
        <div style={{ color: 'var(--color-error)' }}>{error}</div>
      </div>
    );
  }
  return (
    <div className="w-card">
      <h3>Lithuanian Noun Declensions</h3>
      <div style={{ marginBottom: 'var(--spacing-base)' }}>
        <label htmlFor="noun-select" style={{ marginRight: 'var(--spacing-small)' }}>
          Select a noun:
        </label>
        <select 
          id="noun-select"
          value={selectedNoun || ''} 
          onChange={(e) => setSelectedNoun(e.target.value)}
          className="w-mode-option"
          style={{ minWidth: '150px' }}
        >
          <option value="">Choose a noun...</option>
          {availableNouns.map(noun => (
            <option key={noun} value={noun}>
              {noun} ({declensions[noun]?.english || ''})
            </option>
          ))}
        </select>
      </div>
      {selectedNoun && (
        <DeclensionTable 
          noun={selectedNoun}
          declensions={declensions}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
        />
      )}
    </div>
  );
};

export default DeclensionsMode;
