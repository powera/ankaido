/**
 * Corpus Choices Management Utility
 * 
 * This module provides functionality for managing corpus/group selections
 * across different storage modes (local localStorage vs server-based storage).
 * It mirrors the pattern used by activityStatsManager.
 */

import safeStorage from '../DataStorage/safeStorage';
import storageConfigManager from './storageConfigManager';

// --- Types ---
export type CorpusChoices = Record<string, string[]>;
type Listener = (choices: CorpusChoices) => void;

// API Configuration
const API_BASE_URL = '/api/trakaido/corpuschoices';

/**
 * API Client for server-based corpus choices storage
 */
class CorpusChoicesAPIClient {
  /**
   * Get all corpus choices from server
   */
  async getAllChoices(): Promise<CorpusChoices> {
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
      return data.choices || {};
    } catch (error) {
      console.error('Error fetching corpus choices from server:', error);
      throw error;
    }
  }

  /**
   * Save all corpus choices to server
   */
  async saveAllChoices(choices: CorpusChoices): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ choices }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error saving corpus choices to server:', error);
      throw error;
    }
  }

  /**
   * Update choices for a specific corpus
   */
  async updateCorpusChoices(corpus: string, groups: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/corpus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          corpus,
          groups 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error updating corpus choices on server:', error);
      throw error;
    }
  }

  /**
   * Get choices for a specific corpus
   */
  async getCorpusChoices(corpus: string): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/corpus/${encodeURIComponent(corpus)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.groups || [];
    } catch (error) {
      console.error('Error fetching corpus choices from server:', error);
      throw error;
    }
  }
}

// Create API client instance
const apiClient = new CorpusChoicesAPIClient();

// Storage key for localStorage
const STORAGE_KEY = 'ankaido-selected-groups';

/**
 * Corpus Choices Manager
 * Handles loading, saving, and updating corpus/group selections
 */
class CorpusChoicesManager {
  private choices: CorpusChoices = {};
  private isInitialized: boolean = false;
  private listeners: Listener[] = [];

  /**
   * Initialize and load choices from storage (server or localStorage)
   */
  async initialize(): Promise<CorpusChoices> {
    if (this.isInitialized) return this.choices;

    try {
      if (storageConfigManager.isRemoteStorage()) {
        this.choices = await apiClient.getAllChoices();
        console.log('Corpus choices manager initialized from server:', this.choices);
      } else {
        const savedChoices = safeStorage.getItem(STORAGE_KEY);
        this.choices = savedChoices ? JSON.parse(savedChoices) : {};
        console.log('Corpus choices manager initialized from localStorage:', this.choices);
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing corpus choices:', error);
      this.choices = {};
      this.isInitialized = true;
    }

    return this.choices;
  }

  /**
   * Get choices for a specific corpus
   */
  getCorpusChoices(corpus: string): string[] {
    return this.choices[corpus] || [];
  }

  /**
   * Update choices for a specific corpus
   */
  async updateCorpusChoices(corpus: string, groups: string[]): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Update in memory
    this.choices[corpus] = [...groups];

    // Save to storage (server or localStorage)
    try {
      let success = false;
      if (storageConfigManager.isRemoteStorage()) {
        success = await apiClient.updateCorpusChoices(corpus, groups);
        if (success) {
          console.log(`Updated corpus choices on server for ${corpus}:`, groups);
        } else {
          console.warn('Failed to save corpus choices to server');
        }
      } else {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(this.choices));
        success = true;
        console.log(`Updated corpus choices in localStorage for ${corpus}:`, groups);
      }
      
      if (success) {
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error saving corpus choices:', error);
    }

    return this.choices[corpus];
  }

  /**
   * Set all choices at once
   */
  async setAllChoices(choices: CorpusChoices): Promise<CorpusChoices> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Update in memory
    this.choices = { ...choices };

    // Save to storage (server or localStorage)
    try {
      let success = false;
      if (storageConfigManager.isRemoteStorage()) {
        success = await apiClient.saveAllChoices(choices);
        if (success) {
          console.log('Updated all corpus choices on server:', choices);
        } else {
          console.warn('Failed to save all corpus choices to server');
        }
      } else {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(this.choices));
        success = true;
        console.log('Updated all corpus choices in localStorage:', choices);
      }
      
      if (success) {
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error saving all corpus choices:', error);
    }

    return this.choices;
  }

  /**
   * Get all current choices
   */
  getAllChoices(): CorpusChoices {
    return this.choices;
  }

  /**
   * Clear all choices
   */
  async clearAllChoices(): Promise<CorpusChoices> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.choices = {};

    // Save to storage (server or localStorage)
    try {
      let success = false;
      if (storageConfigManager.isRemoteStorage()) {
        success = await apiClient.saveAllChoices({});
        if (success) {
          console.log('Cleared all corpus choices on server');
        } else {
          console.warn('Failed to clear corpus choices on server');
        }
      } else {
        safeStorage.removeItem(STORAGE_KEY);
        success = true;
        console.log('Cleared all corpus choices from localStorage');
      }
      
      if (success) {
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error clearing corpus choices:', error);
    }

    return this.choices;
  }

  /**
   * Add a listener for choices changes
   */
  addListener(callback: Listener): void {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback: Listener): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of choices changes
   */
  notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        // Create a new object reference to ensure React detects the change
        callback({ ...this.choices });
      } catch (error) {
        console.error('Error in corpus choices listener:', error);
      }
    });
  }

  /**
   * Force reinitialization of the choices manager
   * Useful when switching between storage modes
   */
  async forceReinitialize(): Promise<CorpusChoices> {
    this.isInitialized = false;
    this.choices = {};
    return await this.initialize();
  }

  /**
   * Get current storage mode
   */
  getCurrentStorageMode(): 'server' | 'localStorage' {
    return storageConfigManager.isRemoteStorage() ? 'server' : 'localStorage';
  }

  /**
   * Get total number of selected groups across all corpora
   */
  getTotalSelectedGroups(): number {
    return Object.values(this.choices).reduce((total, groups) => total + groups.length, 0);
  }

  /**
   * Check if a specific corpus has any selected groups
   */
  hasSelectedGroups(corpus: string): boolean {
    const groups = this.choices[corpus];
    return !!groups && groups.length > 0;
  }

  /**
   * Check if a specific group is selected in a corpus
   */
  isGroupSelected(corpus: string, group: string): boolean {
    const groups = this.choices[corpus];
    return !!groups && groups.includes(group);
  }
}

// Create and export a singleton instance
export const corpusChoicesManager = new CorpusChoicesManager();
export default corpusChoicesManager;