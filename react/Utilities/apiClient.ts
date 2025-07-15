// apiClient.ts - API client for Lithuanian language features

const API_BASE = '/api/lithuanian';

// --- Type Definitions ---

export interface CorporaResponse {
  corpora: string[];
}

export interface CorpusStructure {
  // Define structure as needed
  [key: string]: any;
}

export interface VoicesResponse {
  voices: string[];
}

export interface VerbCorpusesResponse {
  verb_corpuses: string[];
}

export interface ConjugationsResponse {
  conjugations: Record<string, any>;
  verbs: string[];
  corpus: string;
}

export interface DeclensionsResponse {
  declensions: Record<string, any>;
  available_nouns: string[];
}

export interface LevelsResponse {
  levels: string[];
}

export interface DailyStatsResponse {
  // Define structure as needed
  [key: string]: any;
}

// --- API Functions ---

export const fetchCorpora = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE}/wordlists`);
  if (!response.ok) throw new Error('Failed to fetch corpora');
  const data: CorporaResponse = await response.json();
  return data.corpora;
};

export const fetchCorpusStructure = async (corpus: string): Promise<CorpusStructure> => {
  const response = await fetch(`${API_BASE}/wordlists/${encodeURIComponent(corpus)}`);
  if (!response.ok) throw new Error(`Failed to fetch structure for corpus: ${corpus}`);
  const data: CorpusStructure = await response.json();
  return data;
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

export const fetchVerbCorpuses = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE}/conjugations/corpuses`);
    if (!response.ok) throw new Error('Failed to fetch verb corpuses');
    const data: VerbCorpusesResponse = await response.json();
    return data.verb_corpuses;
  } catch (error) {
    console.warn('Failed to fetch verb corpuses:', error);
    return ['verbs_present']; // fallback to default
  }
};

export const fetchConjugations = async (
  corpus: string = 'verbs_present'
): Promise<ConjugationsResponse> => {
  try {
    const response = await fetch(`${API_BASE}/conjugations?corpus=${encodeURIComponent(corpus)}`);
    if (!response.ok) throw new Error('Failed to fetch conjugations');
    const data: ConjugationsResponse = await response.json();
    return data;
  } catch (error) {
    console.warn('Failed to fetch conjugations:', error);
    return { conjugations: {}, verbs: [], corpus };
  }
};

export const fetchDeclensions = async (): Promise<DeclensionsResponse> => {
  try {
    const response = await fetch(`${API_BASE}/declensions`);
    if (!response.ok) throw new Error('Failed to fetch declensions');
    const data: DeclensionsResponse = await response.json();
    return data;
  } catch (error) {
    console.warn('Failed to fetch declensions:', error);
    return { declensions: {}, available_nouns: [] };
  }
};

export const fetchLevels = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE}/wordlists/levels`);
    if (!response.ok) throw new Error('Failed to fetch levels');
    const data: LevelsResponse = await response.json();
    return data.levels;
  } catch (error) {
    console.warn('Failed to fetch levels:', error);
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

export const getApiBase = (): string => API_BASE;