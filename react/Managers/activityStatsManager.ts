/**
 * Shared Activity stats management utility
 * 
 * This module provides shared functionality for managing Activity stats
 * across different study modes (Journey, Multiple Choice, Listening, etc.)
 */

import indexedDBManager from '../DataStorage/indexedDBManager';
import { StatMode, Stats, Word, WordStats } from '../Utilities/types';
import storageConfigManager from './storageConfigManager';

// All word lists now have GUIDs, so we use GUID-based keys for stats storage

// API Configuration
const API_BASE_URL = '/api/trakaido/journeystats';

// --- Types ---

export type StatsListener = (stats: Stats) => void;

// --- API Client ---

/**
 * API Client for server-based activity stats storage
 */
class ActivityStatsAPIClient {
  /**
   * Get all activity stats from server
   */
  async getAllStats(): Promise<Stats> {
    try {
      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.stats || {};
    } catch (error) {
      console.error('Error fetching activity stats from server:', error);
      throw error;
    }
  }

  /**
   * Save all activity stats to server
   */
  async saveAllStats(stats: Stats): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stats }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error saving activity stats to server:', error);
      throw error;
    }
  }

  /**
   * Update stats for a specific word
   */
  async updateWordStats(wordKey: string, wordStats: WordStats): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/word`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          wordKey,
          wordStats 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error updating word stats on server:', error);
      throw error;
    }
  }

  /**
   * Get stats for a specific word
   */
  async getWordStats(wordKey: string): Promise<WordStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/word/${encodeURIComponent(wordKey)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.wordStats || { ...DEFAULT_WORD_STATS };
    } catch (error) {
      console.error('Error fetching word stats from server:', error);
      throw error;
    }
  }

  /**
   * Increment stats for a single question with nonce protection
   */
  async incrementStats(wordKey: string, statType: StatMode, correct: boolean): Promise<boolean> {
    try {
      const nonce = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(`${API_BASE_URL}/increment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wordKey,
          statType,
          correct,
          nonce
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error incrementing stats on server:', error);
      throw error;
    }
  }
}

// Create API client instance
const apiClient = new ActivityStatsAPIClient();

// Default stats structure for a word
export const DEFAULT_WORD_STATS: WordStats = {
  exposed: false,
  multipleChoice: { correct: 0, incorrect: 0 },
  listeningEasy: { correct: 0, incorrect: 0 },
  listeningHard: { correct: 0, incorrect: 0 },
  typing: { correct: 0, incorrect: 0 },
  blitz: { correct: 0, incorrect: 0 },
  lastSeen: null,
  lastCorrectAnswer: null,
  lastIncorrectAnswer: null
};

// Create a unique key for a word using corpus-prefixed GUID
export const createWordKey = (word: Word): string => {
  if (!word.guid) {
    throw new Error(`Word is missing required GUID: ${word.term || 'unknown'}-${word.definition || 'unknown'}`);
  }
  if (!word.corpus) {
    throw new Error(`Word is missing required corpus: ${word.term || 'unknown'}-${word.definition || 'unknown'}`);
  }
  return `${word.corpus}_${word.guid}`;
};

// Create the old format key for migration purposes
export const createLegacyWordKey = (word: Word): string => `${word.term}-${word.definition}`;

// WordListManager no longer stores activity stats - they are managed separately by activityStatsManager

/**
 * Calculate total correct answers for a word across all modes
 */
export const calculateTotalCorrect = (wordStats: WordStats): number => {
  return (wordStats.multipleChoice?.correct || 0) + 
         (wordStats.listeningEasy?.correct || 0) + 
         (wordStats.listeningHard?.correct || 0) + 
         (wordStats.typing?.correct || 0) + 
         (wordStats.blitz?.correct || 0);
};

/**
 * Calculate total incorrect answers for a word across all modes
 */
export const calculateTotalIncorrect = (wordStats: WordStats): number => {
  return (wordStats.multipleChoice?.incorrect || 0) + 
         (wordStats.listeningEasy?.incorrect || 0) + 
         (wordStats.listeningHard?.incorrect || 0) + 
         (wordStats.typing?.incorrect || 0) + 
         (wordStats.blitz?.incorrect || 0);
};

/**
 * Convert activity stats object to array format suitable for display
 * Each entry includes word data plus calculated totals
 */
export interface DisplayWordStats extends WordStats {
  term: string;
  definition: string;
  totalCorrect: number;
  totalIncorrect: number;
}

export const convertStatsToDisplayArray = (stats: Stats, allWords: Word[] = []): DisplayWordStats[] => {
  if (!stats || Object.keys(stats).length === 0) {
    return [];
  }

  // Create a lookup map for words by corpus-prefixed GUID and legacy key
  const wordByCorpusGuid = new Map<string, Word>();
  const wordByGuid = new Map<string, Word>();
  const wordByLegacyKey = new Map<string, Word>();
  
  allWords.forEach(word => {
    if (word.guid && word.corpus) {
      // New corpus-prefixed GUID format
      wordByCorpusGuid.set(`${word.corpus}_${word.guid}`, word);
      // Also store by plain GUID for migration
      wordByGuid.set(word.guid, word);
    }
    wordByLegacyKey.set(`${word.term}-${word.definition}`, word);
  });

  return Object.entries(stats).map(([key, wordStats]) => {
    let term = 'Unknown';
    let definition = 'Unknown';
    
    // Try to find word by corpus-prefixed GUID first
    const wordByCorpusGuidLookup = wordByCorpusGuid.get(key);
    if (wordByCorpusGuidLookup) {
      term = wordByCorpusGuidLookup.term || 'Unknown';
      definition = wordByCorpusGuidLookup.definition || 'Unknown';
    } else {
      // Try plain GUID for migration
      const wordByGuidLookup = wordByGuid.get(key);
      if (wordByGuidLookup) {
        term = wordByGuidLookup.term || 'Unknown';
        definition = wordByGuidLookup.definition || 'Unknown';
      } else {
        // Check if it's a legacy key format
        const wordByLegacyLookup = wordByLegacyKey.get(key);
        if (wordByLegacyLookup) {
          term = wordByLegacyLookup.term || 'Unknown';
          definition = wordByLegacyLookup.definition || 'Unknown';
        } else {
          // Fallback: try to parse as legacy format
          const keyParts = key.split('-');
          if (keyParts.length >= 2) {
            term = keyParts[0];
            definition = keyParts.slice(1).join('-'); // Handle cases where definition might contain dashes
          }
        }
      }
    }
    
    return {
      term,
      definition,
      ...wordStats,
      totalCorrect: calculateTotalCorrect(wordStats),
      totalIncorrect: calculateTotalIncorrect(wordStats)
    };
  });
};

/**
 * Convert activity stats for a specific corpus to display array format
 * This function filters stats to only include words from the specified corpus
 */
export const convertCorpusStatsToDisplayArray = (stats: Stats, corpus: string, corporaData: any): DisplayWordStats[] => {
  if (!stats || Object.keys(stats).length === 0 || !corpus || !corporaData[corpus]) {
    return [];
  }

  // Get all words from the specified corpus
  const corpusWords: Word[] = [];
  const groups = corporaData[corpus].groups || {};
  Object.values(groups).forEach((groupWords: Word[]) => {
    corpusWords.push(...groupWords);
  });

  // Filter stats to only include entries from this corpus
  const corpusStats: Stats = {};
  Object.entries(stats).forEach(([key, wordStats]) => {
    // Check if this stat key belongs to the specified corpus
    if (key.startsWith(`${corpus}_`)) {
      corpusStats[key] = wordStats;
    }
  });

  return convertStatsToDisplayArray(corpusStats, corpusWords);
};

/**
 * Format timestamp for display in UI
 */
export const formatDate = (timestamp: number | null): string => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

/**
 * Calculate total correct exposures for a word across all modes
 * This is the same as calculateTotalCorrect but with a more descriptive name
 */
export const getTotalCorrectExposures = (wordStats: WordStats): number => {
  return calculateTotalCorrect(wordStats);
};

/**
 * Calculate total exposures (correct + incorrect) for a word across all modes
 */
export const getTotalExposures = (wordStats: WordStats): number => {
  return calculateTotalCorrect(wordStats) + calculateTotalIncorrect(wordStats);
};

/**
 * Filter words to get only those that have been exposed (seen before)
 */
export const getExposedWords = (allWords: Word[], statsManager: ActivityStatsManager): Word[] => {
  return allWords.filter(word => {
    const stats = statsManager.getWordStats(word);
    return stats.exposed;
  });
};

/**
 * Filter words to get only new words (not yet exposed)
 */
export const getNewWords = (allWords: Word[], statsManager: ActivityStatsManager): Word[] => {
  return allWords.filter(word => {
    const stats = statsManager.getWordStats(word);
    return !stats.exposed;
  });
};

/**
 * Activity Stats Manager
 * Handles loading, saving, and updating activity stats
 */
export class ActivityStatsManager {
  private stats: Stats = {};
  private isInitialized: boolean = false;
  private listeners: StatsListener[] = [];

  /**
   * Initialize and load stats from storage (server or indexedDB)
   */
  async initialize(): Promise<Stats> {
    if (this.isInitialized) return this.stats;

    try {
      if (storageConfigManager.isRemoteStorage()) {
        this.stats = await apiClient.getAllStats();
        console.log('Journey stats manager initialized from server:', this.stats);
      } else {
        this.stats = await indexedDBManager.loadJourneyStats();
        console.log('Journey stats manager initialized from indexedDB:', this.stats);
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing activity stats:', error);
      this.stats = {};
      this.isInitialized = true;
    }

    return this.stats;
  }

  /**
   * Get stats for a specific word
   * Handles migration from legacy keys to corpus-prefixed GUID keys
   */
  getWordStats(word: Word): WordStats {
    const wordKey = createWordKey(word);
    
    // First try to get stats with the current corpus-prefixed key
    if (this.stats[wordKey]) {
      return this.stats[wordKey];
    }
    
    // Try plain GUID for migration from old GUID format
    if (word.guid && this.stats[word.guid]) {
      const oldGuidStats = this.stats[word.guid];
      this.stats[wordKey] = oldGuidStats;
      delete this.stats[word.guid];
      
      // Save the migrated stats (async, but don't wait for it)
      this.saveMigratedStats().catch(error => {
        console.error('Error saving migrated stats:', error);
      });
      
      return oldGuidStats;
    }
    
    // Try legacy key for migration from old term-definition format
    const legacyKey = createLegacyWordKey(word);
    if (this.stats[legacyKey]) {
      // Found stats with legacy key, migrate to corpus-prefixed GUID key
      const legacyStats = this.stats[legacyKey];
      this.stats[wordKey] = legacyStats;
      delete this.stats[legacyKey];
      
      // Save the migrated stats (async, but don't wait for it)
      this.saveMigratedStats().catch(error => {
        console.error('Error saving migrated stats:', error);
      });
      
      return legacyStats;
    }
    
    // Return default stats if no existing stats found
    return { ...DEFAULT_WORD_STATS };
  }

  /**
   * Update stats for a word
   */
  async updateWordStats(
    word: Word, 
    mode: StatMode, 
    isCorrect: boolean, 
    shouldExposeWord: boolean = false
  ): Promise<WordStats> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const wordKey = createWordKey(word);
    const currentStats = this.getWordStats(word);
    
    // Always record stats regardless of exposed status
    // The exposed flag is managed separately from stats recording
    
    // Ensure the mode exists with default values
    const currentModeStats = currentStats[mode] || { correct: 0, incorrect: 0 };
    
    const now = Date.now();
    
    // Create updated stats
    const updatedStats: WordStats = {
      ...currentStats,
      exposed: currentStats.exposed || shouldExposeWord, // Only expose if explicitly allowed
      [mode]: {
        ...currentModeStats,
        [isCorrect ? 'correct' : 'incorrect']: currentModeStats[isCorrect ? 'correct' : 'incorrect'] + 1
      },
      lastSeen: now,
      lastCorrectAnswer: isCorrect ? now : currentStats.lastCorrectAnswer,
      lastIncorrectAnswer: !isCorrect ? now : currentStats.lastIncorrectAnswer
    };

    // Update in memory
    this.stats[wordKey] = updatedStats;

    // Save to storage (server or indexedDB)
    try {
      let success = false;
      if (storageConfigManager.isRemoteStorage()) {
        // Use the new increment API for remote storage
        success = await apiClient.incrementStats(wordKey, mode, isCorrect);
        if (success) {
          console.log(`Incremented activity stats on server for ${wordKey}: ${mode} ${isCorrect ? 'correct' : 'incorrect'}`);
        } else {
          console.warn('Failed to increment activity stats on server');
        }
      } else {
        success = await indexedDBManager.saveJourneyStats(this.stats);
        if (success) {
          console.log(`Updated activity stats in indexedDB for ${wordKey}:`, updatedStats);
        } else {
          console.warn('Failed to save activity stats to IndexedDB');
        }
      }
      
      if (success) {
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error saving activity stats:', error);
    }

    return updatedStats;
  }

  /**
   * Get all current stats
   */
  getAllStats(): Stats {
    return this.stats;
  }

  /**
   * Add a listener for stats changes
   */
  addListener(callback: StatsListener): void {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback: StatsListener): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of stats changes
   */
  notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.stats);
      } catch (error) {
        console.error('Error in stats listener:', error);
      }
    });
  }

  /**
   * Update word stats directly with custom properties
   * Used for special cases like marking words as exposed
   */
  async updateWordStatsDirectly(word: Word, updates: Partial<WordStats>): Promise<WordStats> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const wordKey = createWordKey(word);
    const currentStats = this.getWordStats(word);
    
    const now = Date.now();
    
    // Apply updates to current stats
    const updatedStats: WordStats = { 
      ...currentStats, 
      ...updates, 
      lastSeen: now
    };
    
    // If lastCorrectAnswer is not explicitly set in updates, preserve the current value
    if (!updates.hasOwnProperty('lastCorrectAnswer')) {
      updatedStats.lastCorrectAnswer = currentStats.lastCorrectAnswer;
    }
    
    // If lastIncorrectAnswer is not explicitly set in updates, preserve the current value
    if (!updates.hasOwnProperty('lastIncorrectAnswer')) {
      updatedStats.lastIncorrectAnswer = currentStats.lastIncorrectAnswer;
    }
    
    // Update in memory
    this.stats[wordKey] = updatedStats;

    // Save to storage (server or indexedDB)
    try {
      let success = false;
      if (storageConfigManager.isRemoteStorage()) {
        success = await apiClient.updateWordStats(wordKey, updatedStats);
        if (success) {
          console.log(`Updated activity stats directly on server for ${wordKey}:`, updatedStats);
        } else {
          console.warn('Failed to save activity stats to server');
        }
      } else {
        success = await indexedDBManager.saveJourneyStats(this.stats);
        if (success) {
          console.log(`Updated activity stats directly in indexedDB for ${wordKey}:`, updatedStats);
        } else {
          console.warn('Failed to save activity stats to IndexedDB');
        }
      }
      
      if (success) {
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error saving activity stats:', error);
    }

    return updatedStats;
  }

  /**
   * Force reinitialization of the stats manager
   * Useful when switching between storage modes
   */
  async forceReinitialize(): Promise<Stats> {
    this.isInitialized = false;
    this.stats = {};
    return await this.initialize();
  }

  /**
   * Get current storage mode
   */
  getCurrentStorageMode(): 'server' | 'indexedDB' {
    return storageConfigManager.isRemoteStorage() ? 'server' : 'indexedDB';
  }

  /**
   * Save migrated stats to storage
   * Private helper method for migration
   */
  private async saveMigratedStats(): Promise<void> {
    try {
      if (storageConfigManager.isRemoteStorage()) {
        await apiClient.saveAllStats(this.stats);
        console.log('Migrated stats saved to server');
      } else {
        await indexedDBManager.saveJourneyStats(this.stats);
        console.log('Migrated stats saved to indexedDB');
      }
    } catch (error) {
      console.error('Error saving migrated stats:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const activityStatsManager = new ActivityStatsManager();
export default activityStatsManager;