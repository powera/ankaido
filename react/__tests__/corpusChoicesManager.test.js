/**
 * Tests for corpusChoicesManager
 */

import { corpusChoicesManager } from '../Managers/corpusChoicesManager';
import safeStorage from '../DataStorage/safeStorage';

// Mock safeStorage
jest.mock('../DataStorage/safeStorage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}));

// Mock helper function for testing
const setUseServerStorage = (useServer) => {
  // This would normally be handled by storageConfigManager
  global.mockUseServerStorage = useServer;
};

// Mock fetch
global.fetch = jest.fn();

describe('CorpusChoicesManager', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset manager state
    corpusChoicesManager.choices = {};
    corpusChoicesManager.isInitialized = false;
    corpusChoicesManager.listeners = [];

    // Default to local storage mode
    setUseServerStorage(false);
  });

  describe('localStorage mode', () => {
    beforeEach(() => {
      setUseServerStorage(false);
    });

    describe('initialize', () => {
      it('should initialize with empty choices when no localStorage data', async () => {
        safeStorage.getItem.mockReturnValue(null);

        const choices = await corpusChoicesManager.initialize();

        expect(choices).toEqual({});
        expect(corpusChoicesManager.isInitialized).toBe(true);
        expect(safeStorage.getItem).toHaveBeenCalledWith('flashcard-selected-groups');
      });

      it('should initialize with saved choices from localStorage', async () => {
        const savedChoices = { corpus1: ['group1', 'group2'] };
        safeStorage.getItem.mockReturnValue(JSON.stringify(savedChoices));

        const choices = await corpusChoicesManager.initialize();

        expect(choices).toEqual(savedChoices);
        expect(corpusChoicesManager.choices).toEqual(savedChoices);
      });

      it('should handle JSON parse errors gracefully', async () => {
        safeStorage.getItem.mockReturnValue('invalid json');

        const choices = await corpusChoicesManager.initialize();

        expect(choices).toEqual({});
        expect(corpusChoicesManager.isInitialized).toBe(true);
      });

      it('should return existing choices if already initialized', async () => {
        corpusChoicesManager.choices = { existing: ['data'] };
        corpusChoicesManager.isInitialized = true;

        const choices = await corpusChoicesManager.initialize();

        expect(choices).toEqual({ existing: ['data'] });
        expect(safeStorage.getItem).not.toHaveBeenCalled();
      });
    });

    describe('updateCorpusChoices', () => {
      it('should update corpus choices and save to localStorage', async () => {
        await corpusChoicesManager.initialize();

        const result = await corpusChoicesManager.updateCorpusChoices('corpus1', ['group1', 'group2']);

        expect(result).toEqual(['group1', 'group2']);
        expect(corpusChoicesManager.choices.corpus1).toEqual(['group1', 'group2']);
        expect(safeStorage.setItem).toHaveBeenCalledWith(
          'flashcard-selected-groups',
          JSON.stringify({ corpus1: ['group1', 'group2'] })
        );
      });

      it('should initialize if not already initialized', async () => {
        safeStorage.getItem.mockReturnValue(null);

        await corpusChoicesManager.updateCorpusChoices('corpus1', ['group1']);

        expect(corpusChoicesManager.isInitialized).toBe(true);
        expect(safeStorage.getItem).toHaveBeenCalled();
      });
    });

    describe('setAllChoices', () => {
      it('should set all choices and save to localStorage', async () => {
        const newChoices = {
          corpus1: ['group1', 'group2'],
          corpus2: ['groupA', 'groupB']
        };

        await corpusChoicesManager.initialize();
        const result = await corpusChoicesManager.setAllChoices(newChoices);

        expect(result).toEqual(newChoices);
        expect(corpusChoicesManager.choices).toEqual(newChoices);
        expect(safeStorage.setItem).toHaveBeenCalledWith(
          'flashcard-selected-groups',
          JSON.stringify(newChoices)
        );
      });
    });

    describe('clearAllChoices', () => {
      it('should clear all choices and remove from localStorage', async () => {
        corpusChoicesManager.choices = { corpus1: ['group1'] };
        await corpusChoicesManager.initialize();

        const result = await corpusChoicesManager.clearAllChoices();

        expect(result).toEqual({});
        expect(corpusChoicesManager.choices).toEqual({});
        expect(safeStorage.removeItem).toHaveBeenCalledWith('flashcard-selected-groups');
      });
    });
  });

  describe('server mode', () => {
    beforeEach(() => {
      setUseServerStorage(true);
    });

    describe('initialize', () => {
      it('should initialize with choices from server', async () => {
        const serverChoices = { corpus1: ['group1', 'group2'] };
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ choices: serverChoices })
        });

        const choices = await corpusChoicesManager.initialize();

        expect(choices).toEqual(serverChoices);
        expect(fetch).toHaveBeenCalledWith('/api/trakaido/corpuschoices/', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
      });

      it('should handle server errors gracefully', async () => {
        fetch.mockRejectedValueOnce(new Error('Server error'));

        const choices = await corpusChoicesManager.initialize();

        expect(choices).toEqual({});
        expect(corpusChoicesManager.isInitialized).toBe(true);
      });
    });

    describe('updateCorpusChoices', () => {
      it('should update corpus choices on server', async () => {
        fetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ choices: {} })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true })
          });

        await corpusChoicesManager.initialize();
        const result = await corpusChoicesManager.updateCorpusChoices('corpus1', ['group1', 'group2']);

        expect(result).toEqual(['group1', 'group2']);
        expect(fetch).toHaveBeenCalledWith('/api/trakaido/corpuschoices/corpus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            corpus: 'corpus1',
            groups: ['group1', 'group2']
          })
        });
      });
    });

    describe('setAllChoices', () => {
      it('should save all choices to server', async () => {
        const newChoices = { corpus1: ['group1'], corpus2: ['groupA'] };

        fetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ choices: {} })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true })
          });

        await corpusChoicesManager.initialize();
        const result = await corpusChoicesManager.setAllChoices(newChoices);

        expect(result).toEqual(newChoices);
        expect(fetch).toHaveBeenCalledWith('/api/trakaido/corpuschoices/', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ choices: newChoices })
        });
      });
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      corpusChoicesManager.choices = {
        corpus1: ['group1', 'group2'],
        corpus2: ['groupA'],
        corpus3: []
      };
      await corpusChoicesManager.initialize();
    });

    describe('getCorpusChoices', () => {
      it('should return choices for existing corpus', () => {
        const choices = corpusChoicesManager.getCorpusChoices('corpus1');
        expect(choices).toEqual(['group1', 'group2']);
      });

      it('should return empty array for non-existing corpus', () => {
        const choices = corpusChoicesManager.getCorpusChoices('nonexistent');
        expect(choices).toEqual([]);
      });
    });

    describe('getTotalSelectedGroups', () => {
      it('should return total number of selected groups', () => {
        const total = corpusChoicesManager.getTotalSelectedGroups();
        expect(total).toBe(3); // 2 + 1 + 0
      });
    });

    describe('hasSelectedGroups', () => {
      it('should return true for corpus with selected groups', () => {
        expect(corpusChoicesManager.hasSelectedGroups('corpus1')).toBe(true);
        expect(corpusChoicesManager.hasSelectedGroups('corpus2')).toBe(true);
      });

      it('should return false for corpus without selected groups', () => {
        expect(corpusChoicesManager.hasSelectedGroups('corpus3')).toBe(false);
        expect(corpusChoicesManager.hasSelectedGroups('nonexistent')).toBe(false);
      });
    });

    describe('isGroupSelected', () => {
      it('should return true for selected groups', () => {
        expect(corpusChoicesManager.isGroupSelected('corpus1', 'group1')).toBe(true);
        expect(corpusChoicesManager.isGroupSelected('corpus1', 'group2')).toBe(true);
        expect(corpusChoicesManager.isGroupSelected('corpus2', 'groupA')).toBe(true);
      });

      it('should return false for non-selected groups', () => {
        expect(corpusChoicesManager.isGroupSelected('corpus1', 'group3')).toBe(false);
        expect(corpusChoicesManager.isGroupSelected('corpus3', 'group1')).toBe(false);
        expect(corpusChoicesManager.isGroupSelected('nonexistent', 'group1')).toBe(false);
      });
    });

    describe('getCurrentStorageMode', () => {
      it('should return correct storage mode', () => {
        setUseServerStorage(false);
        expect(corpusChoicesManager.getCurrentStorageMode()).toBe('localStorage');

        setUseServerStorage(true);
        expect(corpusChoicesManager.getCurrentStorageMode()).toBe('server');
      });
    });
  });

  describe('listeners', () => {
    it('should add and notify listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      corpusChoicesManager.addListener(listener1);
      corpusChoicesManager.addListener(listener2);

      await corpusChoicesManager.initialize();
      await corpusChoicesManager.updateCorpusChoices('corpus1', ['group1']);

      expect(listener1).toHaveBeenCalledWith({ corpus1: ['group1'] });
      expect(listener2).toHaveBeenCalledWith({ corpus1: ['group1'] });
    });

    it('should remove listeners', async () => {
      const listener = jest.fn();

      corpusChoicesManager.addListener(listener);
      corpusChoicesManager.removeListener(listener);

      await corpusChoicesManager.initialize();
      await corpusChoicesManager.updateCorpusChoices('corpus1', ['group1']);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = jest.fn(() => { throw new Error('Listener error'); });
      const goodListener = jest.fn();

      corpusChoicesManager.addListener(errorListener);
      corpusChoicesManager.addListener(goodListener);

      await corpusChoicesManager.initialize();
      await corpusChoicesManager.updateCorpusChoices('corpus1', ['group1']);

      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('forceReinitialize', () => {
    it('should reinitialize the manager', async () => {
      corpusChoicesManager.choices = { old: ['data'] };
      corpusChoicesManager.isInitialized = true;

      safeStorage.getItem.mockReturnValue(JSON.stringify({ new: ['data'] }));

      const choices = await corpusChoicesManager.forceReinitialize();

      expect(choices).toEqual({ new: ['data'] });
      expect(corpusChoicesManager.isInitialized).toBe(true);
    });
  });
});