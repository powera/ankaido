
import indexedDBManager from '../DataStorage/indexedDBManager';

describe('indexedDBManager', () => {
  let mockDB;
  let mockRequest;
  let mockTransaction;
  let mockStore;

  beforeEach(() => {
    // Reset the manager state
    indexedDBManager.db = null;
    
    // Mock IndexedDB components
    mockStore = {
      getAll: jest.fn(() => mockRequest),
      add: jest.fn(),
      clear: jest.fn(() => mockRequest)
    };
    
    mockTransaction = {
      objectStore: jest.fn(() => mockStore),
      oncomplete: null,
      onerror: null
    };
    
    mockDB = {
      transaction: jest.fn(() => mockTransaction),
      createObjectStore: jest.fn(() => mockStore),
      objectStoreNames: {
        contains: jest.fn(() => false)
      },
      close: jest.fn()
    };
    
    mockRequest = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: []
    };
    
    // Mock global indexedDB
    global.indexedDB = {
      open: jest.fn(() => mockRequest)
    };
  });

  describe('init', () => {
    it('should return existing db if already initialized', async () => {
      indexedDBManager.db = mockDB;
      
      const result = await indexedDBManager.init();
      
      expect(result).toBe(mockDB);
      expect(global.indexedDB.open).not.toHaveBeenCalled();
    });

    it('should successfully initialize database', async () => {
      const initPromise = indexedDBManager.init();
      
      // Simulate successful opening
      mockRequest.result = mockDB;
      mockRequest.onsuccess();
      
      const result = await initPromise;
      
      expect(global.indexedDB.open).toHaveBeenCalledWith('Ankaido', 1);
      expect(result).toBe(mockDB);
      expect(indexedDBManager.db).toBe(mockDB);
    });

    it('should handle database open error', async () => {
      const initPromise = indexedDBManager.init();
      
      // Simulate error
      mockRequest.error = new Error('DB Error');
      mockRequest.onerror();
      
      const result = await initPromise;
      
      expect(result).toBe(null);
      expect(indexedDBManager.db).toBe(null);
    });

    it('should handle upgrade needed event', async () => {
      const initPromise = indexedDBManager.init();
      
      // Simulate upgrade needed
      const upgradeEvent = { target: { result: mockDB } };
      mockRequest.onupgradeneeded(upgradeEvent);
      
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('wordStats', { keyPath: 'wordKey' });
      
      // Complete the initialization
      mockRequest.result = mockDB;
      mockRequest.onsuccess();
      
      await initPromise;
    });

    it('should handle initialization exception', async () => {
      global.indexedDB.open.mockImplementation(() => {
        throw new Error('IndexedDB not supported');
      });
      
      const result = await indexedDBManager.init();
      
      expect(result).toBe(null);
      expect(indexedDBManager.db).toBe(null);
    });
  });

  describe('loadJourneyStats', () => {
    beforeEach(() => {
      indexedDBManager.db = mockDB;
    });

    it('should load stats successfully', async () => {
      const mockStats = [
        { wordKey: 'labas-hello', stats: { exposed: true, correct: 3 } },
        { wordKey: 'aciu-thanks', stats: { exposed: false, correct: 1 } }
      ];
      
      const loadPromise = indexedDBManager.loadJourneyStats();
      
      // Simulate successful load
      mockRequest.result = mockStats;
      mockRequest.onsuccess();
      
      const result = await loadPromise;
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['wordStats'], 'readonly');
      expect(mockStore.getAll).toHaveBeenCalled();
      expect(result).toEqual({
        'labas-hello': { exposed: true, correct: 3 },
        'aciu-thanks': { exposed: false, correct: 1 }
      });
    });

    it('should handle load error', async () => {
      const loadPromise = indexedDBManager.loadJourneyStats();
      
      // Simulate error
      mockRequest.error = new Error('Load error');
      mockRequest.onerror();
      
      const result = await loadPromise;
      
      expect(result).toEqual({});
    });

    it('should handle exception during load', async () => {
      mockDB.transaction.mockImplementation(() => {
        throw new Error('Transaction error');
      });
      
      const result = await indexedDBManager.loadJourneyStats();
      
      expect(result).toEqual({});
    });

    it('should initialize if db is null', async () => {
      indexedDBManager.db = null;
      global.indexedDB.open.mockImplementation(() => {
        const request = { ...mockRequest };
        setTimeout(() => {
          request.result = mockDB;
          request.onsuccess();
        }, 0);
        return request;
      });
      
      const loadPromise = indexedDBManager.loadJourneyStats();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Now simulate the load
      mockRequest.result = [];
      mockRequest.onsuccess();
      
      const result = await loadPromise;
      expect(result).toEqual({});
    });
  });

  describe('saveJourneyStats', () => {
    beforeEach(() => {
      indexedDBManager.db = mockDB;
    });

    it('should save stats successfully', async () => {
      const stats = {
        'labas-hello': { exposed: true, correct: 3 },
        'aciu-thanks': { exposed: false, correct: 1 }
      };
      
      const savePromise = indexedDBManager.saveJourneyStats(stats);
      
      // Simulate successful clear
      mockStore.clear().onsuccess();
      
      // Simulate successful transaction
      mockTransaction.oncomplete();
      
      const result = await savePromise;
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['wordStats'], 'readwrite');
      expect(mockStore.clear).toHaveBeenCalled();
      expect(mockStore.add).toHaveBeenCalledTimes(2);
      expect(mockStore.add).toHaveBeenCalledWith({
        wordKey: 'labas-hello',
        stats: { exposed: true, correct: 3 }
      });
      expect(result).toBe(true);
    });

    it('should handle save error', async () => {
      const stats = { 'test-key': { exposed: true } };
      
      const savePromise = indexedDBManager.saveJourneyStats(stats);
      
      // Simulate transaction error
      mockTransaction.error = new Error('Save error');
      mockTransaction.onerror();
      
      const result = await savePromise;
      
      expect(result).toBe(false);
    });

    it('should handle exception during save', async () => {
      mockDB.transaction.mockImplementation(() => {
        throw new Error('Transaction error');
      });
      
      const result = await indexedDBManager.saveJourneyStats({});
      
      expect(result).toBe(false);
    });

    it('should warn when db not available', async () => {
      indexedDBManager.db = null;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock indexedDB.open to simulate failed initialization
      global.indexedDB.open.mockImplementation(() => {
        const request = { ...mockRequest };
        setTimeout(() => {
          request.error = new Error('Failed to open');
          request.onerror();
        }, 0);
        return request;
      });
      
      const result = await indexedDBManager.saveJourneyStats({});
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('IndexedDB not available for saving');
      
      consoleSpy.mockRestore();
    });
  });

  describe('close', () => {
    it('should close database connection', () => {
      indexedDBManager.db = mockDB;
      
      indexedDBManager.close();
      
      expect(mockDB.close).toHaveBeenCalled();
      expect(indexedDBManager.db).toBe(null);
    });

    it('should handle null database gracefully', () => {
      indexedDBManager.db = null;
      
      expect(() => {
        indexedDBManager.close();
      }).not.toThrow();
    });
  });
});
