/**
 * Utility for safely accessing localStorage with error handling
 * 
 * This wrapper provides methods to safely interact with localStorage,
 * handling potential errors that might occur (like in private browsing mode
 * or when storage quota is exceeded).
 */
const safeStorage = {
  /**
   * Safely retrieves an item from localStorage
   * @param {string} key - The key to retrieve
   * @param {*} defaultValue - Value to return if key doesn't exist or an error occurs
   * @returns {string|null} The stored value or defaultValue
   */
  getItem: (key, defaultValue = null) => {
    try {
      return localStorage.getItem(key) || defaultValue;
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return defaultValue;
    }
  },

  /**
   * Safely stores an item in localStorage
   * @param {string} key - The key to store under
   * @param {string} value - The value to store
   */
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  },

  /**
   * Safely removes an item from localStorage
   * @param {string} key - The key to remove
   */
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  }
};

export default safeStorage;