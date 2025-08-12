import React from 'react';
import DataTable from '../Components/shared/DataTable';
import { CorporaData } from '../Utilities/studyMaterialsUtils';
import { AudioManager, Word } from '../Utilities/types';
import { ActivityStatsManager, calculateTotalCorrect, calculateTotalIncorrect, getTotalExposures } from '../Managers/activityStatsManager';

// Interface for vocabulary group options
interface VocabGroupOption {
  corpus: string;
  group: string;
  displayName: string;
  wordCount: number;
}

// Props interface for VocabularyListActivity
interface VocabularyListActivityProps {
  selectedVocabGroup: string | null;
  setSelectedVocabGroup: (group: string | null) => void;
  vocabGroupOptions: VocabGroupOption[];
  vocabListWords: Word[];
  setVocabListWords: (words: Word[]) => void;
  corporaData: CorporaData;
  audioEnabled: boolean;
  audioManager: AudioManager;
  activityStatsManager: ActivityStatsManager;
}

const VocabularyListActivity: React.FC<VocabularyListActivityProps> = ({ 
  selectedVocabGroup,
  setSelectedVocabGroup,
  vocabGroupOptions,
  vocabListWords,
  setVocabListWords,
  corporaData,
  audioEnabled,
  audioManager,
  activityStatsManager
}) => {
  const loadVocabListForGroup = (optionValue: string) => {
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
    const words: Word[] = corporaData[corpus].groups[group];

    // Sort alphabetically by source language word
    words.sort((a, b) => a.lithuanian.localeCompare(b.lithuanian));
    setVocabListWords(words);
  };

  return (
    <div className="w-card">
      <h3>Vocabulary List</h3>
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
          {vocabGroupOptions.map((option: VocabGroupOption) => (
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
                header: 'Source Language',
                accessor: 'lithuanian'
              },
              {
                header: 'English', 
                accessor: 'english'
              },
              {
                header: 'Total Correct',
                render: (rowData: any, rowIndex: number) => {
                  const stats = activityStatsManager.getWordStats(rowData);
                  return <span>{calculateTotalCorrect(stats)}</span>;
                },
                align: 'center',
                width: '80px'
              },
              {
                header: 'Total Attempts',
                render: (rowData: any, rowIndex: number) => {
                  const stats = activityStatsManager.getWordStats(rowData);
                  return <span>{getTotalExposures(stats)}</span>;
                },
                align: 'center',
                width: '80px'
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
            audioManager={audioManager}
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