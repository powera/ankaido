/**
 * Shared Journey stats management utility
 * 
 * This module provides shared functionality for managing Journey stats
 * across different study modes (Journey, Multiple Choice, Listening, etc.)
 */

import indexedDBManager from './indexedDBManager';

// Default stats structure for a word
export const DEFAULT_WORD_STATS = {
  exposed: false,
  multipleChoice: { correct: 0, incorrect: 0 },
  listening: { correct: 0, incorrect: 0 },
  typing: { correct: 0, incorrect: 0 },
  lastSeen: null
};

// Create a unique key for a word
export const createWordKey = (word) => `${word.lithuanian}-${word.english}`;

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
   * Initialize and load stats from storage
   */
  async initialize() {
    if (this.isInitialized) return this.stats;

    try {
      this.stats = await indexedDBManager.loadJourneyStats();
      this.isInitialized = true;
      console.log('Journey stats manager initialized:', this.stats);
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
    
    // Create updated stats
    const updatedStats = {
      ...currentStats,
      exposed: currentStats.exposed || isCorrect, // Only mark as exposed if correct
      [mode]: {
        ...currentStats[mode],
        [isCorrect ? 'correct' : 'incorrect']: currentStats[mode][isCorrect ? 'correct' : 'incorrect'] + 1
      },
      lastSeen: Date.now()
    };

    // Update in memory
    this.stats[wordKey] = updatedStats;

    // Save to storage
    try {
      const success = await indexedDBManager.saveJourneyStats(this.stats);
      if (success) {
        console.log(`Updated journey stats for ${wordKey}:`, updatedStats);
        this.notifyListeners();
      } else {
        console.warn('Failed to save journey stats to IndexedDB');
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
}

// Create and export a singleton instance
export const journeyStatsManager = new JourneyStatsManager();
export default journeyStatsManager;