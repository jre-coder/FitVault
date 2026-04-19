module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '\\.(png|jpg|gif|svg)$': '<rootDir>/__mocks__/emptyMock.js',
  },
  collectCoverageFrom: [
    'services/**/*.ts',
    'context/**/*.tsx',
    'components/**/*.tsx',
    'constants/**/*.ts',
    '!**/*.d.ts',
  ],
}
