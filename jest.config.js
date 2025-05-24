/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // APIルートのテストなので 'node' を使用 (jsdom は不要)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Path Aliases の設定
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // セットアップファイル (あれば)
  // testMatch: ['**/__tests__/**/*.test.(ts|tsx)'], // テストファイルのパターン
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
}; 
