
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock IndexedDB
const indexedDBMock = {
  open: jest.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          getAll: jest.fn(() => ({ onsuccess: null, result: [] })),
          add: jest.fn(),
          clear: jest.fn(() => ({ onsuccess: null }))
        })),
        oncomplete: null,
        onerror: null
      })),
      createObjectStore: jest.fn(),
      objectStoreNames: { contains: jest.fn(() => false) }
    }
  }))
};
global.indexedDB = indexedDBMock;

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);
