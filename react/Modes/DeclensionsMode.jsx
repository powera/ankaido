
import React from 'react';
import DeclensionTable from '../Components/DeclensionTable';

const DeclensionsMode = ({
  selectedNoun,
  setSelectedNoun,
  availableNouns,
  declensions,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd
}) => {
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
