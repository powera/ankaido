
// Mock localStorage using Object.defineProperty
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
});

import safeStorage from '../DataStorage/safeStorage';

describe('safeStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getItem', () => {
    it('should return stored value when key exists', () => {
      localStorage.getItem.mockReturnValue('test-value');
      
      const result = safeStorage.getItem('test-key');
      
      expect(localStorage.getItem).toHaveBeenCalledWith('test-key');
      expect(result).toBe('test-value');
    });

    it('should return default value when key does not exist', () => {
      localStorage.getItem.mockReturnValue(null);
      
      const result = safeStorage.getItem('non-existent-key', 'default');
      
      expect(result).toBe('default');
    });

    it('should return default value when localStorage throws error', () => {
      localStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = safeStorage.getItem('test-key', 'fallback');
      
      expect(result).toBe('fallback');
    });

    it('should return null as default when no default provided', () => {
      localStorage.getItem.mockReturnValue(null);
      
      const result = safeStorage.getItem('test-key');
      
      expect(result).toBe(null);
    });
  });

  describe('setItem', () => {
    it('should store value successfully', () => {
      safeStorage.setItem('test-key', 'test-value');
      
      expect(localStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      expect(() => {
        safeStorage.setItem('test-key', 'test-value');
      }).not.toThrow();
    });
  });

  describe('removeItem', () => {
    it('should remove item successfully', () => {
      safeStorage.removeItem('test-key');
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => {
        safeStorage.removeItem('test-key');
      }).not.toThrow();
    });
  });
});
