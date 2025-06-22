/**
 * Shared Journey stats management utility
 * 
 * This module provides shared functionality for managing Journey stats
 * across different study modes (Journey, Multiple Choice, Listening, etc.)
 */

import indexedDBManager from '../DataStorage/indexedDBManager';
import storageConfigManager from './storageConfigManager';

// API Configuration
const API_BASE_URL = '/api/trakaido/journeystats';

/**
 * API Client for server-based journey stats storage
 */
class JourneyStatsAPIClient {
  /**
   * Get all journey stats from server
   */
  async getAllStats() {
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
      console.error('Error fetching journey stats from server:', error);
      throw error;
    }
  }

  /**
   * Save all journey stats to server
   */
  async saveAllStats(stats) {
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
      console.error('Error saving journey stats to server:', error);
      throw error;
    }
  }

  /**
   * Update stats for a specific word
   */
  async updateWordStats(wordKey, wordStats) {
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
  async getWordStats(wordKey) {
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
}

// Create API client instance
const apiClient = new JourneyStatsAPIClient();

// Default stats structure for a word
export const DEFAULT_WORD_STATS = {
  exposed: false,
  multipleChoice: { correct: 0, incorrect: 0 },
  listeningEasy: { correct: 0, incorrect: 0 },
  listeningHard: { correct: 0, incorrect: 0 },
  typing: { correct: 0, incorrect: 0 },
  lastSeen: null
};

// Create a unique key for a word
export const createWordKey = (word) => `${word.lithuanian}-${word.english}`;

/**
 * Helper function to update WordListManager with journey stats
 * This keeps WordListManager in sync with the latest stats
 */
export const updateWordListManagerStats = (wordListManager, stats) => {
  if (wordListManager) {
    wordListManager.journeyStats = stats;
    console.log('Updated wordListManager.journeyStats:', wordListManager.journeyStats);
    wordListManager.notifyStateChange();
  }
};

/**
 * Calculate total correct answers for a word across all modes
 */
export const calculateTotalCorrect = (wordStats) => {
  return (wordStats.multipleChoice?.correct || 0) + 
         (wordStats.listeningEasy?.correct || 0) + 
         (wordStats.listeningHard?.correct || 0) + 
         (wordStats.typing?.correct || 0);
};

/**
 * Calculate total incorrect answers for a word across all modes
 */
export const calculateTotalIncorrect = (wordStats) => {
  return (wordStats.multipleChoice?.incorrect || 0) + 
         (wordStats.listeningEasy?.incorrect || 0) + 
         (wordStats.listeningHard?.incorrect || 0) + 
         (wordStats.typing?.incorrect || 0);
};

/**
 * Convert journey stats object to array format suitable for display
 * Each entry includes word data plus calculated totals
 */
export const convertStatsToDisplayArray = (stats) => {
  if (!stats || Object.keys(stats).length === 0) {
    return [];
  }

  return Object.entries(stats).map(([key, wordStats]) => {
    const [lithuanian, english] = key.split('-');
    return {
      lithuanian,
      english,
      ...wordStats,
      totalCorrect: calculateTotalCorrect(wordStats),
      totalIncorrect: calculateTotalIncorrect(wordStats)
    };
  });
};

/**
 * Format timestamp for display in UI
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

/**
 * Calculate total correct exposures for a word across all modes
 * This is the same as calculateTotalCorrect but with a more descriptive name
 */
export const getTotalCorrectExposures = (wordStats) => {
  return calculateTotalCorrect(wordStats);
};

/**
 * Filter words to get only those that have been exposed (seen before)
 */
export const getExposedWords = (allWords, statsManager) => {
  return allWords.filter(word => {
    const stats = statsManager.getWordStats(word);
    return stats.exposed;
  });
};

/**
 * Filter words to get only new words (not yet exposed)
 */
export const getNewWords = (allWords, statsManager) => {
  return allWords.filter(word => {
    const stats = statsManager.getWordStats(word);
    return !stats.exposed;
  });
};

/**
 * Journey Stats Manager
 * Handles loading, saving, and updating journey stats
 */
class JourneyStatsManager {
  constructor() {
    this.stats = {};
    this.isInitialized = false;
    this.listeners = [];
  }

  /**
   * Initialize and load stats from storage (server or indexedDB)
   */
  async initialize() {
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
      console.error('Error initializing journey stats:', error);
      this.stats = {};
      this.isInitialized = true;
    }

    return this.stats;
  }

  /**
   * Get stats for a specific word
   */
  getWordStats(word) {
    const wordKey = createWordKey(word);
    return this.stats[wordKey] || { ...DEFAULT_WORD_STATS };
  }

  /**
   * Update stats for a word
   */
  async updateWordStats(word, mode, isCorrect) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const wordKey = createWordKey(word);
    const currentStats = this.getWordStats(word);
    
    // Ensure the mode exists with default values
    const currentModeStats = currentStats[mode] || { correct: 0, incorrect: 0 };
    
    // Create updated stats
    const updatedStats = {
      ...currentStats,
      exposed: currentStats.exposed || isCorrect, // Only mark as exposed if correct
      [mode]: {
        ...currentModeStats,
        [isCorrect ? 'correct' : 'incorrect']: currentModeStats[isCorrect ? 'correct' : 'incorrect'] + 1
      },
      lastSeen: Date.now()
    };

    // Update in memory
    this.stats[wordKey] = updatedStats;

    // Save to storage (server or indexedDB)
    try {
      let success = false;
      if (storageConfigManager.isRemoteStorage()) {
        success = await apiClient.updateWordStats(wordKey, updatedStats);
        if (success) {
          console.log(`Updated journey stats on server for ${wordKey}:`, updatedStats);
        } else {
          console.warn('Failed to save journey stats to server');
        }
      } else {
        success = await indexedDBManager.saveJourneyStats(this.stats);
        if (success) {
          console.log(`Updated journey stats in indexedDB for ${wordKey}:`, updatedStats);
        } else {
          console.warn('Failed to save journey stats to IndexedDB');
        }
      }
      
      if (success) {
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error saving journey stats:', error);
    }

    return updatedStats;
  }

  /**
   * Get all current stats
   */
  getAllStats() {
    return this.stats;
  }

  /**
   * Add a listener for stats changes
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of stats changes
   */
  notifyListeners() {
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
  async updateWordStatsDirectly(word, updates) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const wordKey = createWordKey(word);
    const currentStats = this.getWordStats(word);
    
    // Apply updates to current stats
    const updatedStats = { 
      ...currentStats, 
      ...updates, 
      lastSeen: Date.now() 
    };
    
    // Update in memory
    this.stats[wordKey] = updatedStats;

    // Save to storage (server or indexedDB)
    try {
      let success = false;
      if (storageConfigManager.isRemoteStorage()) {
        success = await apiClient.updateWordStats(wordKey, updatedStats);
        if (success) {
          console.log(`Updated journey stats directly on server for ${wordKey}:`, updatedStats);
        } else {
          console.warn('Failed to save journey stats to server');
        }
      } else {
        success = await indexedDBManager.saveJourneyStats(this.stats);
        if (success) {
          console.log(`Updated journey stats directly in indexedDB for ${wordKey}:`, updatedStats);
        } else {
          console.warn('Failed to save journey stats to IndexedDB');
        }
      }
      
      if (success) {
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error saving journey stats:', error);
    }

    return updatedStats;
  }

  /**
   * Force reinitialization of the stats manager
   * Useful when switching between storage modes
   */
  async forceReinitialize() {
    this.isInitialized = false;
    this.stats = {};
    return await this.initialize();
  }

  /**
   * Get current storage mode
   */
  getCurrentStorageMode() {
    return storageConfigManager.isRemoteStorage() ? 'server' : 'indexedDB';
  }
}

// Create and export a singleton instance
export const journeyStatsManager = new JourneyStatsManager();
export default journeyStatsManager;