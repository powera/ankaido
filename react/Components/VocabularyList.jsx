
import React from 'react';
import AudioButton from './AudioButton';

const VocabularyList = ({ 
  selectedVocabGroup,
  setSelectedVocabGroup,
  vocabGroupOptions,
  vocabListWords,
  setVocabListWords,
  corporaData,
  audioEnabled,
  playAudio
}) => {
  const loadVocabListForGroup = (optionValue) => {
    if (!optionValue) {
      setSelectedVocabGroup(null);
      setVocabListWords([]);
      return;
    }
    
    // Parse the combined value to get corpus and group
    const [corpus, group] = optionValue.split('|');
    if (!corpus || !group || !corporaData[corpus]?.groups[group]) return;
    
    setSelectedVocabGroup(optionValue);
    
    // Get words for this specific group
    const words = corporaData[corpus].groups[group].map(word => ({
      ...word,
      corpus,
      group
    }));
    
    // Sort alphabetically by Lithuanian word
    words.sort((a, b) => a.lithuanian.localeCompare(b.lithuanian));
    setVocabListWords(words);
  };
  return (
    <div className="w-card">
      <h3>Lithuanian Vocabulary List</h3>
      <div style={{ marginBottom: 'var(--spacing-base)' }}>
        <label htmlFor="group-select" style={{ marginRight: 'var(--spacing-small)' }}>
          Select a vocabulary group:
        </label>
        <select
          id="group-select"
          value={selectedVocabGroup || ''}
          onChange={(e) => loadVocabListForGroup(e.target.value)}
          className="w-mode-option"
          style={{ minWidth: '250px' }}
        >
          <option value="">-- Select Group --</option>
          {vocabGroupOptions.map(option => (
            <option key={`${option.corpus}|${option.group}`} value={`${option.corpus}|${option.group}`}>
              {option.displayName} ({option.wordCount} words)
            </option>
          ))}
        </select>
      </div>
      
      {selectedVocabGroup && (
        <div>
          <h4>{vocabListWords.length} Words</h4>
          <div style={{ 
            maxHeight: '60vh', 
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius)',
            padding: 'var(--spacing-small)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ 
                    padding: 'var(--spacing-small)', 
                    borderBottom: '2px solid var(--color-border)',
                    textAlign: 'left',
                    position: 'sticky',
                    top: 0,
                    background: 'var(--color-card-bg)'
                  }}>Lithuanian</th>
                  <th style={{ 
                    padding: 'var(--spacing-small)', 
                    borderBottom: '2px solid var(--color-border)',
                    textAlign: 'left',
                    position: 'sticky',
                    top: 0,
                    background: 'var(--color-card-bg)'
                  }}>English</th>
                  <th style={{ 
                    padding: 'var(--spacing-small)', 
                    borderBottom: '2px solid var(--color-border)',
                    textAlign: 'center',
                    width: '60px',
                    position: 'sticky',
                    top: 0,
                    background: 'var(--color-card-bg)'
                  }}>Audio</th>
                </tr>
              </thead>
              <tbody>
                {vocabListWords.map((word, index) => (
                  <tr key={index} style={{ 
                    backgroundColor: index % 2 === 0 ? 'var(--color-card-bg)' : 'var(--color-card-bg-alt)' 
                  }}>
                    <td style={{ padding: 'var(--spacing-small)', borderBottom: '1px solid var(--color-border)' }}>
                      {word.lithuanian}
                    </td>
                    <td style={{ padding: 'var(--spacing-small)', borderBottom: '1px solid var(--color-border)' }}>
                      {word.english}
                    </td>
                    <td style={{ 
                      padding: 'var(--spacing-small)', 
                      borderBottom: '1px solid var(--color-border)',
                      textAlign: 'center'
                    }}>
                      <AudioButton 
                        word={word.lithuanian}
                        audioEnabled={audioEnabled}
                        playAudio={playAudio}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default VocabularyList;
