
/**
 * Utility for safely accessing IndexedDB with error handling
 * 
 * This wrapper provides methods to safely interact with IndexedDB,
 * handling potential errors and providing fallbacks to localStorage.
 */

const indexedDBManager = {
  dbName: 'LithuanianLearning',
  dbVersion: 1,
  db: null,

  /**
   * Initialize the IndexedDB connection
   * @returns {Promise<IDBDatabase|null>} The database instance or null if failed
   */
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => {
          console.error('IndexedDB failed to open:', request.error);
          this.db = null;
          resolve(null);
        };
        
        request.onsuccess = () => {
          this.db = request.result;
          console.log('IndexedDB opened successfully');
          resolve(this.db);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Create wordStats store if it doesn't exist
          if (!db.objectStoreNames.contains('wordStats')) {
            const store = db.createObjectStore('wordStats', { keyPath: 'wordKey' });
            console.log('Created wordStats object store');
          }
        };
      } catch (error) {
        console.error('IndexedDB initialization error:', error);
        this.db = null;
        resolve(null);
      }
    });
  },

  /**
   * Load all journey stats from IndexedDB
   * @returns {Promise<Object>} The journey stats object
   */
  async loadJourneyStats() {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      console.warn('IndexedDB not available, returning empty stats');
      return {};
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['wordStats'], 'readonly');
        const store = transaction.objectStore('wordStats');
        const request = store.getAll();
        
        request.onsuccess = () => {
          const stats = {};
          request.result.forEach(item => {
            stats[item.wordKey] = item.stats;
          });
          console.log('Loaded journey stats from IndexedDB:', stats);
          resolve(stats);
        };
        
        request.onerror = () => {
          console.error('Error loading from IndexedDB:', request.error);
          resolve({});
        };
      } catch (error) {
        console.error('IndexedDB load error:', error);
        resolve({});
      }
    });
  },

  /**
   * Save journey stats to IndexedDB
   * @param {Object} stats - The journey stats to save
   * @returns {Promise<boolean>} Success status
   */
  async saveJourneyStats(stats) {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      console.warn('IndexedDB not available for saving');
      return false;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['wordStats'], 'readwrite');
        const store = transaction.objectStore('wordStats');
        
        // Clear existing data
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          // Add new data
          Object.entries(stats).forEach(([wordKey, wordStats]) => {
            store.add({ wordKey, stats: wordStats });
          });
        };
        
        transaction.oncomplete = () => {
          console.log('Journey stats saved to IndexedDB successfully');
          resolve(true);
        };
        
        transaction.onerror = () => {
          console.error('Error saving to IndexedDB:', transaction.error);
          resolve(false);
        };
      } catch (error) {
        console.error('IndexedDB save error:', error);
        resolve(false);
      }
    });
  },

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
};

export default indexedDBManager;
