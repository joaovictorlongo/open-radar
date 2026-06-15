/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.(ts|js|mjs|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.html$',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@angular|@nativescript|rxjs)/)',
  ],
  moduleNameMapper: {
    '^@nativescript/core$': '<rootDir>/src/testing/mocks/nativescript-core.mock.ts',
    '^@nativescript/core/(.*)$': '<rootDir>/src/testing/mocks/nativescript-$1.mock.ts',
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/app/core/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/testing/**',
  ],
  coverageDirectory: 'coverage',
};
