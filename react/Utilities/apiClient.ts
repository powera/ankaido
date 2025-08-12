// apiClient.ts - API client for language learning features

const API_BASE = '/api/language';

// --- Type Definitions ---

export interface Word {
  lithuanian: string;
  english: string;
  corpus: string;
  group: string;
  guid: string;
  levels: string[];
  alternatives: {
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

// Removed VoicesResponse - now using browser TTS voices









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
  try {
    const registryResponse = await fetch('/data/vocabulary_registry.json');
    if (registryResponse.ok) {
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
              allWords.push(...vocabData as Word[]);
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
      
      if (allWords.length > 0) {
        console.log(`Total vocabulary loaded: ${allWords.length} words from ${registry.vocabularies.filter(v => v.enabled).length} sources`);
        return allWords;
      }
    } else {
      console.warn('Vocabulary registry not found, falling back to hardcoded loading');
      
      // Fallback to hardcoded loading if registry is not available
      // Load GRE words
      try {
        const greResponse = await fetch('/data/gre_words_full.json');
        if (greResponse.ok) {
          const greData = await greResponse.json();
          if (Array.isArray(greData)) {
            allWords.push(...greData as Word[]);
            console.log(`Loaded ${greData.length} words from GRE vocabulary`);
          }
        }
      } catch (error) {
        console.warn('Failed to load GRE words:', error);
      }
      
      // Load Lithuanian words
      try {
        const lithuanianResponse = await fetch('/data/lithuanian_words.json');
        if (lithuanianResponse.ok) {
          const lithuanianData = await lithuanianResponse.json();
          if (Array.isArray(lithuanianData)) {
            allWords.push(...lithuanianData as Word[]);
            console.log(`Loaded ${lithuanianData.length} words from Lithuanian vocabulary`);
          }
        }
      } catch (error) {
        console.warn('Failed to load Lithuanian words:', error);
      }
      
      if (allWords.length > 0) {
        console.log(`Total vocabulary loaded: ${allWords.length} words`);
        return allWords;
      }
    }
  } catch (error) {
    console.error('Failed to load vocabulary registry:', error);
  }
  
  // If no words were loaded from any source, throw an error
  if (allWords.length === 0) {
    throw new Error('No vocabulary data could be loaded from local sources');
  }
  
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

// Removed fetchAvailableVoices - now using browser TTS voices







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

export const getApiBase = (): string => API_BASE;