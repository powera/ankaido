
import activityStatsManager, { 
  createWordKey, 
  calculateTotalCorrect, 
  calculateTotalIncorrect,
  DEFAULT_WORD_STATS,
  convertStatsToDisplayArray
} from '../Managers/activityStatsManager';

// Mock indexedDBManager
const mockIndexedDBManager = {
  loadJourneyStats: jest.fn(() => Promise.resolve({})),
  saveJourneyStats: jest.fn(() => Promise.resolve(true))
};
jest.mock('../DataStorage/indexedDBManager', () => ({
  __esModule: true,
  default: mockIndexedDBManager,
  ...mockIndexedDBManager
}));

describe('activityStatsManager utility functions', () => {
  describe('createWordKey', () => {
    it('should create correct word key', () => {
      const word = { lithuanian: 'labas', english: 'hello' };
      const key = createWordKey(word);
      expect(key).toBe('labas-hello');
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
    it('should convert stats object to display array', () => {
      const stats = {
        'labas-hello': {
          exposed: true,
          multipleChoice: { correct: 3, incorrect: 1 },
          listeningEasy: { correct: 2, incorrect: 0 },
          lastSeen: 1640995200000
        }
      };
      
      const result = convertStatsToDisplayArray(stats);
      
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

describe('JourneyStatsManager', () => {
  let indexedDBManager;

  beforeEach(async () => {
    // Reset the manager state
    activityStatsManager.stats = {};
    activityStatsManager.isInitialized = false;
    activityStatsManager.listeners = [];
    
    indexedDBManager = require('../DataStorage/indexedDBManager').default;
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should load stats from IndexedDB', async () => {
      const mockStats = { 'test-word': { exposed: true } };
      indexedDBManager.loadJourneyStats.mockResolvedValue(mockStats);
      
      const result = await activityStatsManager.initialize();
      
      expect(indexedDBManager.loadJourneyStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
      expect(activityStatsManager.isInitialized).toBe(true);
    });

    it('should handle initialization errors', async () => {
      indexedDBManager.loadJourneyStats.mockRejectedValue(new Error('DB Error'));
      
      const result = await activityStatsManager.initialize();
      
      expect(result).toEqual({});
      expect(activityStatsManager.isInitialized).toBe(true);
    });
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

  describe('updateWordStats', () => {
    it('should update stats for correct answer', async () => {
      activityStatsManager.isInitialized = true;
      indexedDBManager.saveJourneyStats.mockResolvedValue(true);
      
      const word = { lithuanian: 'labas', english: 'hello' };
      const result = await activityStatsManager.updateWordStats(word, 'multipleChoice', true);
      
      expect(result.exposed).toBe(true);
      expect(result.multipleChoice.correct).toBe(1);
      expect(result.multipleChoice.incorrect).toBe(0);
      expect(result.lastSeen).toBeDefined();
      expect(indexedDBManager.saveJourneyStats).toHaveBeenCalled();
    });

    it('should update stats for incorrect answer', async () => {
      activityStatsManager.isInitialized = true;
      indexedDBManager.saveJourneyStats.mockResolvedValue(true);
      
      const word = { lithuanian: 'labas', english: 'hello' };
      const result = await activityStatsManager.updateWordStats(word, 'multipleChoice', false);
      
      expect(result.exposed).toBe(false);
      expect(result.multipleChoice.correct).toBe(0);
      expect(result.multipleChoice.incorrect).toBe(1);
    });

    it('should initialize if not already initialized', async () => {
      activityStatsManager.isInitialized = false;
      indexedDBManager.loadJourneyStats.mockResolvedValue({});
      indexedDBManager.saveJourneyStats.mockResolvedValue(true);
      
      const word = { lithuanian: 'labas', english: 'hello' };
      await activityStatsManager.updateWordStats(word, 'multipleChoice', true);
      
      expect(indexedDBManager.loadJourneyStats).toHaveBeenCalled();
      expect(activityStatsManager.isInitialized).toBe(true);
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
