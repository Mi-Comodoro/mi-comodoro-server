import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/../tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/index.ts',
    '!**/*.entity.ts',
    '!**/*.dto.ts',
    '!**/migrations/**',
    '!**/seed/**',
    '!**/scripts/**',
    '!**/types/**',
    '!**/*.d.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  coverageThreshold: {
    global: {
      lines: 56,
      functions: 55,
      statements: 57,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov'],
};

export default config;
