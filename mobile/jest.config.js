module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./__mocks__/setup.js'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '\\.(png|jpg|gif|svg)$': '<rootDir>/__mocks__/emptyMock.js',
    '@expo/vector-icons': '<rootDir>/__mocks__/expoVectorIconsMock.js',
  },
  collectCoverageFrom: [
    'services/**/*.ts',
    'context/**/*.tsx',
    'components/**/*.tsx',
    'constants/**/*.ts',
    'hooks/**/*.ts',
    '!**/*.d.ts',
  ],
}
