
// apiClient.js - API client for Lithuanian language features
const API_BASE = '/api/lithuanian';

export const fetchCorpora = async () => {
  const response = await fetch(`${API_BASE}/wordlists`);
  if (!response.ok) throw new Error('Failed to fetch corpora');
  const data = await response.json();
  return data.corpora;
};

export const fetchCorpusStructure = async (corpus) => {
  const response = await fetch(`${API_BASE}/wordlists/${encodeURIComponent(corpus)}`);
  if (!response.ok) throw new Error(`Failed to fetch structure for corpus: ${corpus}`);
  const data = await response.json();
  return data;
};

export const fetchAvailableVoices = async () => {
  try {
    const response = await fetch(`${API_BASE}/audio/voices`);
    if (!response.ok) throw new Error('Failed to fetch voices');
    const data = await response.json();
    return data.voices;
  } catch (error) {
    console.warn('Failed to fetch available voices:', error);
    return [];
  }
};

export const fetchVerbCorpuses = async () => {
  try {
    const response = await fetch(`${API_BASE}/conjugations/corpuses`);
    if (!response.ok) throw new Error('Failed to fetch verb corpuses');
    const data = await response.json();
    return data.verb_corpuses;
  } catch (error) {
    console.warn('Failed to fetch verb corpuses:', error);
    return ['verbs_present']; // fallback to default
  }
};

export const fetchConjugations = async (corpus = 'verbs_present') => {
  try {
    const response = await fetch(`${API_BASE}/conjugations?corpus=${encodeURIComponent(corpus)}`);
    if (!response.ok) throw new Error('Failed to fetch conjugations');
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Failed to fetch conjugations:', error);
    return { conjugations: {}, verbs: [], corpus };
  }
};

export const fetchDeclensions = async () => {
  try {
    const response = await fetch(`${API_BASE}/declensions`);
    if (!response.ok) throw new Error('Failed to fetch declensions');
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Failed to fetch declensions:', error);
    return { declensions: {}, available_nouns: [] };
  }
};

export const fetchLevels = async () => {
  try {
    const response = await fetch(`${API_BASE}/wordlists/levels`);
    if (!response.ok) throw new Error('Failed to fetch levels');
    const data = await response.json();
    return data.levels;
  } catch (error) {
    console.warn('Failed to fetch levels:', error);
    return {};
  }
};

export const fetchDailyStats = async () => {
  try {
    const response = await fetch('/api/trakaido/journeystats/daily');
    if (!response.ok) throw new Error('Failed to fetch daily stats');
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Failed to fetch daily stats:', error);
    return null;
  }
};

export const getApiBase = () => API_BASE;
