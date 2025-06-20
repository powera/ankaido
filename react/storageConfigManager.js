/**
 * Storage Configuration Manager
 * 
 * Centralized management for storage mode selection (local vs remote)
 * This replaces the USE_SERVER_STORAGE pattern across different managers
 */

import safeStorage from './safeStorage';

// Configuration key for localStorage
const STORAGE_CONFIG_KEY = 'trakaido-storage-config';

// Storage modes
export const STORAGE_MODES = {
  LOCAL: 'local',
  REMOTE: 'remote'
};

/**
 * Storage Configuration Manager
 * Handles the global storage mode preference
 */
class StorageConfigManager {
  constructor() {
    this.currentMode = null;
    this.isInitialized = false;
    this.listeners = [];
  }

  /**
   * Initialize the storage configuration
   * This should be called at app startup
   */
  initialize() {
    if (this.isInitialized) return this.currentMode;

    try {
      const savedConfig = safeStorage.getItem(STORAGE_CONFIG_KEY);
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        this.currentMode = config.mode;
        console.log('Storage config initialized from localStorage:', this.currentMode);
      } else {
        // No configuration found - this indicates a new user
        this.currentMode = null;
        console.log('No storage configuration found - new user detected');
      }
    } catch (error) {
      console.error('Error initializing storage config:', error);
      this.currentMode = null;
    }

    this.isInitialized = true;
    return this.currentMode;
  }

  /**
   * Set the storage mode preference
   */
  setStorageMode(mode) {
    if (!Object.values(STORAGE_MODES).includes(mode)) {
      throw new Error(`Invalid storage mode: ${mode}. Must be one of: ${Object.values(STORAGE_MODES).join(', ')}`);
    }

    const previousMode = this.currentMode;
    this.currentMode = mode;

    // Save to localStorage
    try {
      const config = {
        mode: mode,
        timestamp: new Date().toISOString()
      };
      safeStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
      console.log('Storage mode updated to:', mode);

      // Notify listeners if mode actually changed
      if (previousMode !== mode) {
        this.notifyListeners(mode, previousMode);
      }
    } catch (error) {
      console.error('Error saving storage config:', error);
      // Revert the change if save failed
      this.currentMode = previousMode;
      throw error;
    }

    return this.currentMode;
  }

  /**
   * Get the current storage mode
   */
  getStorageMode() {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.currentMode;
  }

  /**
   * Check if storage mode is configured (not a new user)
   */
  isConfigured() {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.currentMode !== null;
  }

  /**
   * Check if current mode is remote storage
   */
  isRemoteStorage() {
    return this.getStorageMode() === STORAGE_MODES.REMOTE;
  }

  /**
   * Check if current mode is local storage
   */
  isLocalStorage() {
    return this.getStorageMode() === STORAGE_MODES.LOCAL;
  }

  /**
   * Reset storage configuration (for testing or user reset)
   */
  reset() {
    this.currentMode = null;
    this.isInitialized = false;
    safeStorage.removeItem(STORAGE_CONFIG_KEY);
    console.log('Storage configuration reset');
    this.notifyListeners(null, this.currentMode);
  }

  /**
   * Add a listener for storage mode changes
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
   * Notify all listeners of storage mode changes
   */
  notifyListeners(newMode, previousMode) {
    this.listeners.forEach(callback => {
      try {
        callback(newMode, previousMode);
      } catch (error) {
        console.error('Error in storage config listener:', error);
      }
    });
  }

  /**
   * Get configuration info for debugging
   */
  getConfigInfo() {
    return {
      currentMode: this.currentMode,
      isInitialized: this.isInitialized,
      isConfigured: this.isConfigured(),
      isRemoteStorage: this.isRemoteStorage(),
      isLocalStorage: this.isLocalStorage()
    };
  }
}

// Create and export a singleton instance
export const storageConfigManager = new StorageConfigManager();
export default storageConfigManager;