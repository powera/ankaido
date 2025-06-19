
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@components/(.*)$': '<rootDir>/react/Components/$1',
    '^@modes/(.*)$': '<rootDir>/react/Modes/$1'
  },
  testMatch: [
    '<rootDir>/react/**/__tests__/**/*.(js|jsx)',
    '<rootDir>/react/**/*.(test|spec).(js|jsx)'
  ],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'jsx', 'json'],
  collectCoverageFrom: [
    'react/**/*.{js,jsx}',
    '!react/main.jsx',
    '!react/index.html',
    '!react/js/**/*'
  ]
};
