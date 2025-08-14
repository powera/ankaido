import React, { useState, useEffect } from 'react';
import DataTable from '../Components/shared/DataTable';
import { CorporaData } from '../Utilities/studyMaterialsUtils';
import { AudioManager, Word, SortDirection } from '../Utilities/types';
import { ActivityStatsManager, calculateTotalCorrect, calculateTotalIncorrect, getTotalExposures } from '../Managers/activityStatsManager';
import { getVocabularyListDisplayTags } from '../Utilities/apiClient';

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
  // State for table sorting
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  // State for display tags
  const [displayTags, setDisplayTags] = useState<string[]>([]);

  const loadVocabListForGroup = async (optionValue: string) => {
    if (!optionValue) {
      setSelectedVocabGroup(null);
      setVocabListWords([]);
      setSortField('');
      setSortDirection('asc');
      setDisplayTags([]);
      return;
    }

    // Parse the combined value to get corpus and group
    const [corpus, group] = optionValue.split('|');
    if (!corpus || !group || !corporaData[corpus]?.groups[group]) return;

    setSelectedVocabGroup(optionValue);

    // Get words for this specific group
    const words: Word[] = corporaData[corpus].groups[group];

    // Load display tags for this corpus
    const tags = await getVocabularyListDisplayTags(corpus);
    setDisplayTags(tags);

    // Sort alphabetically by term (default sort)
    words.sort((a, b) => {
      const aValue = a.term || a.lithuanian || '';
      const bValue = b.term || b.lithuanian || '';
      return aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
    });
    setVocabListWords(words);
    
    // Reset sorting to default
    setSortField('term');
    setSortDirection('asc');
  };

  // Helper function to extract tag values from structured tags
  const getTagValue = (word: Word, tagPrefix: string): string => {
    if (!word.metadata?.tags) return '';
    
    const tag = word.metadata.tags.find(t => t.startsWith(`${tagPrefix}:`));
    if (!tag) return '';
    
    const value = tag.split(':')[1];
    
    // Special handling for different tag types
    if (tagPrefix === 'court') {
      if (value === 'supreme') return 'Supreme Court';
      if (value === 'circuit') return 'Circuit Court';
      if (value === 'district') return 'District Court';
      if (value === 'state') return 'State Court';
      return value;
    }
    
    if (tagPrefix === 'circuit') {
      if (value === 'supreme') return 'Supreme';
      return `${value} Circuit`;
    }
    
    if (tagPrefix === 'year') {
      return value;
    }
    
    return value;
  };

  const handleSort = (field: string) => {
    let newDirection: SortDirection = 'asc';
    
    // If clicking the same field, toggle direction
    if (sortField === field) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    
    setSortField(field);
    setSortDirection(newDirection);
    
    // Create a copy of the words array and sort it
    const sortedWords = [...vocabListWords];
    
    sortedWords.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      if (field === 'totalCorrect') {
        const aStats = activityStatsManager.getWordStats(a);
        const bStats = activityStatsManager.getWordStats(b);
        aValue = calculateTotalCorrect(aStats);
        bValue = calculateTotalCorrect(bStats);
      } else if (field === 'totalAttempts') {
        const aStats = activityStatsManager.getWordStats(a);
        const bStats = activityStatsManager.getWordStats(b);
        aValue = getTotalExposures(aStats);
        bValue = getTotalExposures(bStats);
      } else if (displayTags.includes(field)) {
        // Handle structured tag fields
        aValue = getTagValue(a, field);
        bValue = getTagValue(b, field);
        
        // Special numeric sorting for year
        if (field === 'year') {
          aValue = parseInt(aValue) || 0;
          bValue = parseInt(bValue) || 0;
        }
      } else {
        // For text fields (term, definition, lithuanian, english)
        if (field === 'term') {
          aValue = a.term || a.lithuanian || '';
          bValue = b.term || b.lithuanian || '';
        } else if (field === 'definition') {
          aValue = a.definition || a.english || '';
          bValue = b.definition || b.english || '';
        } else {
          aValue = a[field as keyof Word];
          bValue = b[field as keyof Word];
        }
      }
      
      // Handle numeric sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return newDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
        return newDirection === 'asc' ? comparison : -comparison;
      }
      
      return 0;
    });
    
    setVocabListWords(sortedWords);
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
                header: 'Term',
                render: (rowData: any) => rowData.term || rowData.lithuanian || '',
                sortable: true,
                sortKey: 'term'
              },
              {
                header: 'Definition', 
                render: (rowData: any) => rowData.definition || rowData.english || '',
                sortable: true,
                sortKey: 'definition'
              },
              // Dynamic columns based on display tags
              ...displayTags.map(tag => ({
                header: tag === 'court' ? 'Court' : 
                       tag === 'circuit' ? 'Circuit' : 
                       tag === 'year' ? 'Year' : 
                       tag.charAt(0).toUpperCase() + tag.slice(1),
                render: (rowData: any) => getTagValue(rowData, tag),
                sortable: true,
                sortKey: tag,
                align: 'center' as const,
                width: tag === 'year' ? '80px' : '120px'
              })),
              {
                header: 'Total Correct',
                render: (rowData: any, rowIndex: number) => {
                  const stats = activityStatsManager.getWordStats(rowData);
                  return <span>{calculateTotalCorrect(stats)}</span>;
                },
                align: 'center',
                width: '80px',
                sortable: true,
                sortKey: 'totalCorrect'
              },
              {
                header: 'Total Attempts',
                render: (rowData: any, rowIndex: number) => {
                  const stats = activityStatsManager.getWordStats(rowData);
                  return <span>{getTotalExposures(stats)}</span>;
                },
                align: 'center',
                width: '80px',
                sortable: true,
                sortKey: 'totalAttempts'
              },
              {
                header: 'Audio',
                type: 'audio',
                audioWord: 'term',
                render: (rowData: any) => rowData.term || rowData.lithuanian || '',
                align: 'center',
                width: '60px',
                sortable: false
              }
            ]}
            data={vocabListWords}
            sortable={true}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
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