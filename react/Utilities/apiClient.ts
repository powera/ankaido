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

export interface VoicesResponse {
  voices: string[];
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
  const response = await fetch('/api/trakaido/lithuanian/wordlists');
  if (!response.ok) throw new Error('Failed to fetch wordlists');
  const data = await response.json();
  
  // Handle different response formats after API conversion
  if (Array.isArray(data)) {
    return data as Word[];
  } else if (data && Array.isArray(data.words)) {
    return data.words as Word[];
  } else if (data && Array.isArray(data.wordlists)) {
    return data.wordlists as Word[];
  } else if (data && typeof data === 'object') {
    // If it's an object, try to extract words from common property names
    const possibleArrays = [data.data, data.results, data.items];
    for (const arr of possibleArrays) {
      if (Array.isArray(arr)) {
        return arr as Word[];
      }
    }
  }
  
  // If we can't find an array, throw an error with more context
  console.error('Unexpected API response format:', data);
  throw new Error(`API returned unexpected format. Expected array or object with words array, got: ${typeof data}`);
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

export const fetchAvailableVoices = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE}/audio/voices`);
    if (!response.ok) throw new Error('Failed to fetch voices');
    const data: VoicesResponse = await response.json();
    return data.voices;
  } catch (error) {
    console.warn('Failed to fetch available voices:', error);
    return [];
  }
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

export const getApiBase = (): string => API_BASE;