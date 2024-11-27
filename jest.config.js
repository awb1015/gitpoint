/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
      '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  moduleNameMapper: {
      '^vscode$': '<rootDir>/src/__mocks__/vscode.ts'
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
      global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
      }
  }
};