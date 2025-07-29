
// Mock indexedDBManager
const mockIndexedDBManager = {
  loadJourneyStats: jest.fn(() => Promise.resolve({})),
  saveJourneyStats: jest.fn(() => Promise.resolve(true))
};

jest.mock('../DataStorage/indexedDBManager', () => mockIndexedDBManager);

// Mock storageConfigManager to use local storage
jest.mock('../Managers/storageConfigManager', () => ({
  isRemoteStorage: jest.fn(() => false)
}));

import activityStatsManager, {
    calculateTotalCorrect,
    calculateTotalIncorrect,
    convertStatsToDisplayArray,
    createWordKey,
    DEFAULT_WORD_STATS
} from '../Managers/activityStatsManager';

describe('activityStatsManager utility functions', () => {
  describe('createWordKey', () => {
    it('should create correct word key using legacy format when GUID feature is disabled', () => {
      const word = { guid: 'guid-123', lithuanian: 'labas', english: 'hello' };
      const key = createWordKey(word);
      expect(key).toBe('labas-hello'); // Should use legacy format since USE_GUID_KEYS is false
    });

    it('should use legacy format for words without GUID', () => {
      const word = { lithuanian: 'labas', english: 'hello' };
      const key = createWordKey(word);
      expect(key).toBe('labas-hello');
    });

    it('should handle words with special characters', () => {
      const word = { lithuanian: 'ačiū', english: 'thank you' };
      const key = createWordKey(word);
      expect(key).toBe('ačiū-thank you');
    });
  });

  describe('calculateTotalCorrect', () => {
    it('should calculate total correct answers across all modes', () => {
      const stats = {
        multipleChoice: { correct: 5, incorrect: 2 },
        listeningEasy: { correct: 3, incorrect: 1 },
        listeningHard: { correct: 2, incorrect: 3 },
        typing: { correct: 4, incorrect: 1 }
      };
      
      const total = calculateTotalCorrect(stats);
      expect(total).toBe(14); // 5 + 3 + 2 + 4
    });

    it('should handle missing mode stats', () => {
      const stats = {
        multipleChoice: { correct: 5, incorrect: 2 }
      };
      
      const total = calculateTotalCorrect(stats);
      expect(total).toBe(5);
    });
  });

  describe('calculateTotalIncorrect', () => {
    it('should calculate total incorrect answers across all modes', () => {
      const stats = {
        multipleChoice: { correct: 5, incorrect: 2 },
        listeningEasy: { correct: 3, incorrect: 1 },
        listeningHard: { correct: 2, incorrect: 3 },
        typing: { correct: 4, incorrect: 1 }
      };
      
      const total = calculateTotalIncorrect(stats);
      expect(total).toBe(7); // 2 + 1 + 3 + 1
    });
  });

  describe('convertStatsToDisplayArray', () => {
    it('should convert stats object to display array with GUID keys', () => {
      const allWords = [
        { guid: 'guid-123', lithuanian: 'labas', english: 'hello' }
      ];
      const stats = {
        'guid-123': {
          exposed: true,
          multipleChoice: { correct: 3, incorrect: 1 },
          listeningEasy: { correct: 2, incorrect: 0 },
          lastSeen: 1640995200000
        }
      };
      
      const result = convertStatsToDisplayArray(stats, allWords);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        lithuanian: 'labas',
        english: 'hello',
        exposed: true,
        multipleChoice: { correct: 3, incorrect: 1 },
        listeningEasy: { correct: 2, incorrect: 0 },
        lastSeen: 1640995200000,
        totalCorrect: 5,
        totalIncorrect: 1
      });
    });

    it('should convert stats object to display array with legacy keys', () => {
      const allWords = [
        { guid: 'guid-123', lithuanian: 'labas', english: 'hello' }
      ];
      const stats = {
        'labas-hello': {
          exposed: true,
          multipleChoice: { correct: 3, incorrect: 1 },
          listeningEasy: { correct: 2, incorrect: 0 },
          lastSeen: 1640995200000
        }
      };
      
      const result = convertStatsToDisplayArray(stats, allWords);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        lithuanian: 'labas',
        english: 'hello',
        exposed: true,
        multipleChoice: { correct: 3, incorrect: 1 },
        listeningEasy: { correct: 2, incorrect: 0 },
        lastSeen: 1640995200000,
        totalCorrect: 5,
        totalIncorrect: 1
      });
    });

    it('should fallback to parsing legacy key format when word not found', () => {
      const stats = {
        'labas-hello': {
          exposed: true,
          multipleChoice: { correct: 3, incorrect: 1 },
          listeningEasy: { correct: 2, incorrect: 0 },
          lastSeen: 1640995200000
        }
      };
      
      const result = convertStatsToDisplayArray(stats, []);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        lithuanian: 'labas',
        english: 'hello',
        exposed: true,
        multipleChoice: { correct: 3, incorrect: 1 },
        listeningEasy: { correct: 2, incorrect: 0 },
        lastSeen: 1640995200000,
        totalCorrect: 5,
        totalIncorrect: 1
      });
    });

    it('should return empty array for empty stats', () => {
      const result = convertStatsToDisplayArray({});
      expect(result).toEqual([]);
    });

    it('should handle null/undefined stats', () => {
      expect(convertStatsToDisplayArray(null)).toEqual([]);
      expect(convertStatsToDisplayArray(undefined)).toEqual([]);
    });
  });
});

describe('ActivityStatsManager', () => {
  beforeEach(async () => {
    // Reset the manager state
    activityStatsManager.stats = {};
    activityStatsManager.isInitialized = false;
    activityStatsManager.listeners = [];
    
    jest.clearAllMocks();
  });

  describe('getWordStats', () => {
    it('should return existing stats for a word', () => {
      const wordStats = { exposed: true, multipleChoice: { correct: 3, incorrect: 1 } };
      activityStatsManager.stats = { 'labas-hello': wordStats };
      
      const word = { lithuanian: 'labas', english: 'hello' };
      const result = activityStatsManager.getWordStats(word);
      
      expect(result).toEqual(wordStats);
    });

    it('should return default stats for new word', () => {
      const word = { lithuanian: 'naujas', english: 'new' };
      const result = activityStatsManager.getWordStats(word);
      
      expect(result).toEqual(DEFAULT_WORD_STATS);
    });
  });

  describe('listeners', () => {
    it('should add and notify listeners', async () => {
      const mockListener = jest.fn();
      activityStatsManager.addListener(mockListener);
      
      activityStatsManager.notifyListeners();
      
      expect(mockListener).toHaveBeenCalledWith(activityStatsManager.stats);
    });

    it('should remove listeners', () => {
      const mockListener = jest.fn();
      activityStatsManager.addListener(mockListener);
      activityStatsManager.removeListener(mockListener);
      
      activityStatsManager.notifyListeners();
      
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => { throw new Error('Listener error'); });
      const normalListener = jest.fn();
      
      activityStatsManager.addListener(errorListener);
      activityStatsManager.addListener(normalListener);
      
      expect(() => {
        activityStatsManager.notifyListeners();
      }).not.toThrow();
      
      expect(normalListener).toHaveBeenCalled();
    });
  });
});
