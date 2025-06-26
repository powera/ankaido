import React from 'react';
import DataTable from '../Components/shared/DataTable';

const VocabularyListActivity = ({ 
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
                header: 'Audio',
                type: 'audio',
                audioWord: 'lithuanian',
                align: 'center',
                width: '60px'
              }
            ]}
            data={vocabListWords}
            audioEnabled={audioEnabled}
            playAudio={playAudio}
            maxHeight="60vh"
            stickyHeader={true}
            striped={true}
          />
        </div>
      )}
    </div>
  );
};

export default VocabularyListActivity;