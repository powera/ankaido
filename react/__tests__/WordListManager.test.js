
import WordListManager from '../WordListManager';

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
    if (manager.autoAdvanceTimer) {
      clearTimeout(manager.autoAdvanceTimer);
    }
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(manager.allWords).toEqual([]);
      expect(manager.currentCard).toBe(0);
      expect(manager.showAnswer).toBe(false);
      expect(manager.stats).toEqual({ correct: 0, incorrect: 0, total: 0 });
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

    it('should reset state when generating new list', () => {
      manager.currentCard = 5;
      manager.showAnswer = true;
      manager.selectedAnswer = 'test';
      
      const selectedGroups = { 'corpus1': ['group1'] };
      manager.generateWordsList(selectedGroups, mockCorporaData);
      
      expect(manager.currentCard).toBe(0);
      expect(manager.showAnswer).toBe(false);
      expect(manager.selectedAnswer).toBe(null);
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

      it('should reset answer state', () => {
        manager.showAnswer = true;
        manager.selectedAnswer = 'test';
        manager.typedAnswer = 'typed';
        
        manager.nextCard();
        
        expect(manager.showAnswer).toBe(false);
        expect(manager.selectedAnswer).toBe(null);
        expect(manager.typedAnswer).toBe('');
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

  describe('multiple choice options generation', () => {
    beforeEach(() => {
      const selectedGroups = { 'corpus1': ['group1'] };
      const mockCorporaData = {
        'corpus1': {
          groups: {
            'group1': [
              { lithuanian: 'labas', english: 'hello' },
              { lithuanian: 'ačiū', english: 'thank you' },
              { lithuanian: 'taip', english: 'yes' },
              { lithuanian: 'ne', english: 'no' },
              { lithuanian: 'prašom', english: 'please' },
              { lithuanian: 'atsiprašau', english: 'sorry' }
            ]
          }
        }
      };
      manager.generateWordsList(selectedGroups, mockCorporaData);
    });

    it('should generate correct number of options based on difficulty', () => {
      mockSettings.difficulty = 'easy';
      manager.generateMultipleChoiceOptions('english-to-lithuanian', 'multiple-choice');
      expect(manager.multipleChoiceOptions).toHaveLength(4);

      mockSettings.difficulty = 'medium';
      manager.generateMultipleChoiceOptions('english-to-lithuanian', 'multiple-choice');
      expect(manager.multipleChoiceOptions).toHaveLength(6);

      mockSettings.difficulty = 'hard';
      manager.generateMultipleChoiceOptions('english-to-lithuanian', 'multiple-choice');
      expect(manager.multipleChoiceOptions).toHaveLength(6); // Limited by available words
    });

    it('should include correct answer in options', () => {
      const currentWord = manager.getCurrentWord();
      manager.generateMultipleChoiceOptions('english-to-lithuanian', 'multiple-choice');
      
      expect(manager.multipleChoiceOptions).toContain(currentWord.lithuanian);
    });

    it('should handle listening mode correctly', () => {
      manager.generateMultipleChoiceOptions('lithuanian-to-english', 'listening');
      const currentWord = manager.getCurrentWord();
      
      expect(manager.multipleChoiceOptions).toContain(currentWord.english);
    });
  });

  describe('stats management', () => {
    it('should update correct stats', () => {
      manager.updateStatsCorrect();
      
      expect(manager.stats.correct).toBe(1);
      expect(manager.stats.total).toBe(1);
      expect(manager.stats.incorrect).toBe(0);
    });

    it('should update incorrect stats', () => {
      manager.updateStatsIncorrect();
      
      expect(manager.stats.incorrect).toBe(1);
      expect(manager.stats.total).toBe(1);
      expect(manager.stats.correct).toBe(0);
    });

    it('should reset stats', () => {
      manager.stats = { correct: 5, incorrect: 3, total: 8 };
      manager.resetCards();
      
      expect(manager.stats).toEqual({ correct: 0, incorrect: 0, total: 0 });
    });
  });

  describe('multiple choice answer handling', () => {
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

    it('should handle correct answer', () => {
      const currentWord = manager.getCurrentWord();
      const correctAnswer = currentWord.lithuanian;
      
      manager.handleMultipleChoiceAnswer(correctAnswer, 'english-to-lithuanian', 'multiple-choice', false, 2.5);
      
      expect(manager.selectedAnswer).toBe(correctAnswer);
      expect(manager.showAnswer).toBe(true);
      expect(manager.stats.correct).toBe(1);
      expect(manager.stats.total).toBe(1);
    });

    it('should handle incorrect answer', () => {
      const wrongAnswer = 'wrong';
      
      manager.handleMultipleChoiceAnswer(wrongAnswer, 'english-to-lithuanian', 'multiple-choice', false, 2.5);
      
      expect(manager.selectedAnswer).toBe(wrongAnswer);
      expect(manager.showAnswer).toBe(true);
      expect(manager.stats.incorrect).toBe(1);
      expect(manager.stats.total).toBe(1);
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

    it('should set show answer', () => {
      manager.setShowAnswer(true);
      expect(manager.showAnswer).toBe(true);
      expect(mockStateChangeCallback).toHaveBeenCalled();
    });

    it('should set typed answer', () => {
      manager.setTypedAnswer('test answer');
      expect(manager.typedAnswer).toBe('test answer');
    });

    it('should set typing feedback', () => {
      manager.setTypingFeedback('correct');
      expect(manager.typingFeedback).toBe('correct');
    });
  });
});
