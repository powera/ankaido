// apiClient.ts - API client for language learning features

// --- Type Definitions ---

export interface Word {
  // New field names (preferred)
  term: string;
  definition: string;
  // Legacy field names (deprecated - use term/definition instead)
  lithuanian: string;
  english: string;
  corpus: string;
  group: string;
  guid: string;
  levels: string[];
  alternatives: {
    // New field names (preferred)
    term: string[];
    definition: string[];
    // Legacy field names (deprecated - use term/definition instead)
    english: string[];
    lithuanian: string[];
  };
  metadata: {
    difficulty_level: number | null;
    frequency_rank: number;
    notes: string;
    tags: string[];
  };
}

export interface CorporaResponse {
  corpora: string[];
}

export interface CorpusStructure {
  groups: {
    [group: string]: Word[];
  };
}

export interface VocabularyRegistryEntry {
  id: string;
  name: string;
  corpus: string;
  file: string;
  description: string;
  enabled: boolean;
  metadata: {
    source: string;
    language_pair: string;
    difficulty_levels: string[];
    word_count: number | null;
    last_updated: string;
  };
}

export interface VocabularyRegistry {
  vocabularies: VocabularyRegistryEntry[];
  schema_version: string;
  last_updated: string;
}


export interface ActivityProgress {
  correct: number;
  incorrect: number;
}

export interface ExposedProgress {
  new: number;
  total: number;
}

export interface DailyStatsResponse {
  actualBaselineDay?: string;
  currentDay: string;
  targetBaselineDay?: string;
  progress: {
    exposed?: ExposedProgress;
    blitz?: ActivityProgress;
    listeningEasy?: ActivityProgress;
    listeningHard?: ActivityProgress;
    multipleChoice?: ActivityProgress;
    typing?: ActivityProgress;
    [key: string]: ActivityProgress | ExposedProgress | undefined;
  };
}

// --- API Functions ---

export const fetchAllWordlists = async (): Promise<Word[]> => {
  const allWords: Word[] = [];
  
  // Load vocabulary registry and process all enabled vocabularies
  const registryResponse = await fetch('/data/vocabulary_registry.json');
  if (!registryResponse.ok) {
    throw new Error('Failed to fetch vocabulary registry');
  }
  
  const registry: VocabularyRegistry = await registryResponse.json();
  
  // Load each enabled vocabulary
  for (const vocab of registry.vocabularies) {
    if (!vocab.enabled) {
      console.log(`Skipping disabled vocabulary: ${vocab.name}`);
      continue;
    }
    
    try {
      const vocabResponse = await fetch(`/data/${vocab.file}`);
      if (vocabResponse.ok) {
        const vocabData = await vocabResponse.json();
        if (Array.isArray(vocabData)) {
          // Ensure both new and legacy field names are populated
          const mappedWords = vocabData.map((word: any) => {
            const mappedWord = { ...word };
            
            // If the word has 'term' and 'definition', ensure legacy fields are populated
            if (word.term && word.definition) {
              mappedWord.lithuanian = word.term;
              mappedWord.english = word.definition;
            }
            // If the word has legacy fields but not new ones, populate new fields
            else if (word.lithuanian && word.english) {
              mappedWord.term = word.lithuanian;
              mappedWord.definition = word.english;
            }
            
            return mappedWord;
          });
          allWords.push(...mappedWords as Word[]);
          console.log(`Loaded ${vocabData.length} words from ${vocab.name} (${vocab.corpus})`);
        } else {
          console.warn(`Invalid data format in ${vocab.file}: expected array`);
        }
      } else {
        console.warn(`Failed to fetch ${vocab.file}: ${vocabResponse.status}`);
      }
    } catch (error) {
      console.warn(`Failed to load ${vocab.name}:`, error);
    }
  }
  
  if (allWords.length === 0) {
    throw new Error('No vocabulary data could be loaded from local sources');
  }
  
  console.log(`Total vocabulary loaded: ${allWords.length} words from ${registry.vocabularies.filter(v => v.enabled).length} sources`);
  return allWords;
};

export const fetchCorpora = async (): Promise<string[]> => {
  const words = await fetchAllWordlists();
  const corpora = [...new Set(words.map(word => word.corpus))];
  return corpora.sort();
};

export const fetchCorpusStructure = async (corpus: string): Promise<CorpusStructure> => {
  const words = await fetchAllWordlists();
  const corpusWords = words.filter(word => word.corpus === corpus);
  
  const groups: { [group: string]: Word[] } = {};
  corpusWords.forEach(word => {
    if (!groups[word.group]) {
      groups[word.group] = [];
    }
    groups[word.group].push(word);
  });
  
  return { groups };
};

export const fetchDailyStats = async (): Promise<DailyStatsResponse | null> => {
  try {
    const response = await fetch('/api/trakaido/journeystats/daily');
    if (!response.ok) throw new Error('Failed to fetch daily stats');
    const data: DailyStatsResponse = await response.json();
    return data;
  } catch (error) {
    console.warn('Failed to fetch daily stats:', error);
    return null;
  }
};

export const fetchWeeklyStats = async (): Promise<DailyStatsResponse | null> => {
  try {
    const response = await fetch('/api/trakaido/journeystats/weekly');
    if (!response.ok) throw new Error('Failed to fetch weekly stats');
    const data: DailyStatsResponse = await response.json();
    return data;
  } catch (error) {
    console.warn('Failed to fetch weekly stats:', error);
    return null;
  }
};