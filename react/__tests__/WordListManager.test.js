
import WordListManager from '../Managers/wordListManager';

describe('WordListManager', () => {
  let manager;
  let mockSafeStorage;
  let mockSettings;
  let mockStateChangeCallback;

  beforeEach(() => {
    mockSafeStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    
    mockSettings = {
      difficulty: 'medium',
      autoAdvance: false,
      defaultDelay: 2.5
    };
    
    mockStateChangeCallback = jest.fn();
    
    manager = new WordListManager(mockSafeStorage, mockSettings);
    manager.setStateChangeCallback(mockStateChangeCallback);
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(manager.allWords).toEqual([]);
      expect(manager.currentCard).toBe(0);
      expect(manager.sessionStats).toEqual({ correct: 0, incorrect: 0, total: 0 });
    });

    it('should set state change callback', () => {
      const callback = jest.fn();
      manager.setStateChangeCallback(callback);
      expect(manager.onStateChange).toBe(callback);
    });
  });

  describe('generateWordsList', () => {
    const mockCorporaData = {
      'corpus1': {
        groups: {
          'group1': [
            { lithuanian: 'labas', english: 'hello' },
            { lithuanian: 'ačiū', english: 'thank you' }
          ],
          'group2': [
            { lithuanian: 'taip', english: 'yes' }
          ]
        }
      }
    };

    it('should generate words list from selected groups', () => {
      const selectedGroups = {
        'corpus1': ['group1', 'group2']
      };
      
      manager.generateWordsList(selectedGroups, mockCorporaData);
      
      expect(manager.allWords).toHaveLength(3);
      expect(manager.allWords.every(word => word.corpus === 'corpus1')).toBe(true);
      expect(mockStateChangeCallback).toHaveBeenCalled();
    });

    it('should handle empty corpora data', () => {
      const selectedGroups = { 'corpus1': ['group1'] };
      
      manager.generateWordsList(selectedGroups, {});
      
      expect(manager.allWords).toEqual([]);
      expect(manager.currentCard).toBe(0);
    });

    it('should reset current card when generating new list', () => {
      manager.currentCard = 5;
      
      const selectedGroups = { 'corpus1': ['group1'] };
      manager.generateWordsList(selectedGroups, mockCorporaData);
      
      expect(manager.currentCard).toBe(0);
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      const selectedGroups = { 'corpus1': ['group1'] };
      const mockCorporaData = {
        'corpus1': {
          groups: {
            'group1': [
              { lithuanian: 'labas', english: 'hello' },
              { lithuanian: 'ačiū', english: 'thank you' },
              { lithuanian: 'taip', english: 'yes' }
            ]
          }
        }
      };
      manager.generateWordsList(selectedGroups, mockCorporaData);
    });

    describe('nextCard', () => {
      it('should advance to next card', () => {
        manager.nextCard();
        expect(manager.currentCard).toBe(1);
        expect(mockStateChangeCallback).toHaveBeenCalled();
      });

      it('should wrap around to first card', () => {
        manager.currentCard = 2; // Last card
        manager.nextCard();
        expect(manager.currentCard).toBe(0);
      });


    });

    describe('prevCard', () => {
      it('should go to previous card', () => {
        manager.currentCard = 1;
        manager.prevCard();
        expect(manager.currentCard).toBe(0);
      });

      it('should wrap around to last card', () => {
        manager.currentCard = 0;
        manager.prevCard();
        expect(manager.currentCard).toBe(2); // Last card index
      });
    });
  });

  describe('stats management', () => {
    it('should update correct stats', () => {
      manager.updateSessionStatsCorrect();
      
      expect(manager.sessionStats.correct).toBe(1);
      expect(manager.sessionStats.total).toBe(1);
      expect(manager.sessionStats.incorrect).toBe(0);
    });

    it('should update incorrect stats', () => {
      manager.updateSessionStatsIncorrect();
      
      expect(manager.sessionStats.incorrect).toBe(1);
      expect(manager.sessionStats.total).toBe(1);
      expect(manager.sessionStats.correct).toBe(0);
    });

    it('should reset stats when resetting cards', () => {
      manager.sessionStats = { correct: 5, incorrect: 3, total: 8 };
      manager.resetCards();
      
      expect(manager.sessionStats).toEqual({ correct: 0, incorrect: 0, total: 0 });
    });

    it('should update stats with boolean parameter', () => {
      manager.updateSessionStats(true);
      expect(manager.sessionStats.correct).toBe(1);
      expect(manager.sessionStats.total).toBe(1);

      manager.updateSessionStats(false);
      expect(manager.sessionStats.incorrect).toBe(1);
      expect(manager.sessionStats.total).toBe(2);
    });

    it('should get session stats copy', () => {
      manager.sessionStats.correct = 3;
      const stats = manager.getSessionStats();
      expect(stats).toEqual({ correct: 3, incorrect: 0, total: 0 });
      
      // Verify it's a copy, not reference
      stats.correct = 10;
      expect(manager.sessionStats.correct).toBe(3);
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      const selectedGroups = { 'corpus1': ['group1'] };
      const mockCorporaData = {
        'corpus1': {
          groups: {
            'group1': [
              { lithuanian: 'labas', english: 'hello' },
              { lithuanian: 'ačiū', english: 'thank you' }
            ]
          }
        }
      };
      manager.generateWordsList(selectedGroups, mockCorporaData);
    });

    it('should get current word', () => {
      const currentWord = manager.getCurrentWord();
      expect(currentWord).toBe(manager.allWords[0]);
    });

    it('should get total words count', () => {
      expect(manager.getTotalWords()).toBe(2);
    });

    it('should notify state change when callback is set', () => {
      manager.notifyStateChange();
      expect(mockStateChangeCallback).toHaveBeenCalledWith({
        allWords: manager.allWords,
        currentCard: manager.currentCard,
        stats: manager.sessionStats
      });
    });
  });
});
