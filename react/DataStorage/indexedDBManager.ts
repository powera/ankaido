/**
 * Utility for safely accessing IndexedDB with error handling
 * 
 * This wrapper provides methods to safely interact with IndexedDB,
 * handling potential errors and providing fallbacks to localStorage.
 */

import { WordStats, Stats } from '../Utilities/types';

// Interface for the word stats stored in IndexedDB
interface WordStatsEntry {
  wordKey: string;
  stats: WordStats;
}

// Interface for the IndexedDB manager
interface IndexedDBManager {
  dbName: string;
  dbVersion: number;
  db: IDBDatabase | null;
  init(): Promise<IDBDatabase | null>;
  loadJourneyStats(): Promise<Stats>;
  saveJourneyStats(stats: Stats): Promise<boolean>;
  close(): void;
}

const indexedDBManager: IndexedDBManager = {
  dbName: 'Ankaido',
  dbVersion: 1,
  db: null,

  /**
   * Initialize the IndexedDB connection
   * @returns {Promise<IDBDatabase|null>} The database instance or null if failed
   */
  async init(): Promise<IDBDatabase | null> {
    if (this.db) return this.db;

    return new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request: IDBOpenDBRequest = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = (): void => {
          console.error('IndexedDB failed to open:', request.error);
          this.db = null;
          resolve(null);
        };
        
        request.onsuccess = (): void => {
          this.db = request.result;
          console.log('IndexedDB opened successfully');
          resolve(this.db);
        };
        
        request.onupgradeneeded = (event: IDBVersionChangeEvent): void => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create wordStats store if it doesn't exist
          if (!db.objectStoreNames.contains('wordStats')) {
            const store: IDBObjectStore = db.createObjectStore('wordStats', { keyPath: 'wordKey' });
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
   * @returns {Promise<Stats>} The journey stats object
   */
  async loadJourneyStats(): Promise<Stats> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      console.warn('IndexedDB not available');
      return {};
    }

    return new Promise<Stats>((resolve) => {
      try {
        const transaction: IDBTransaction = this.db!.transaction(['wordStats'], 'readonly');
        const store: IDBObjectStore = transaction.objectStore('wordStats');
        const request: IDBRequest<WordStatsEntry[]> = store.getAll();
        
        request.onsuccess = (): void => {
          const stats: Stats = {};
          request.result.forEach((item: WordStatsEntry) => {
            stats[item.wordKey] = item.stats;
          });
          console.log('Loaded journey stats from IndexedDB:', stats);
          resolve(stats);
        };
        
        request.onerror = (): void => {
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
   * @param {Stats} stats - The journey stats to save
   * @returns {Promise<boolean>} Success status
   */
  async saveJourneyStats(stats: Stats): Promise<boolean> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      console.warn('IndexedDB not available for saving');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      try {
        const transaction: IDBTransaction = this.db!.transaction(['wordStats'], 'readwrite');
        const store: IDBObjectStore = transaction.objectStore('wordStats');
        
        // Clear existing data
        const clearRequest: IDBRequest = store.clear();
        
        clearRequest.onsuccess = (): void => {
          // Add new data
          Object.entries(stats).forEach(([wordKey, wordStats]: [string, WordStats]) => {
            const entry: WordStatsEntry = { wordKey, stats: wordStats };
            store.add(entry);
          });
        };
        
        transaction.oncomplete = (): void => {
          console.log('Journey stats saved to IndexedDB successfully');
          resolve(true);
        };
        
        transaction.onerror = (): void => {
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
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
};

export default indexedDBManager;