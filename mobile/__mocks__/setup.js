// Required for react-test-renderer in React 19 — enables the legacy (non-concurrent)
// renderer path that works in a node test environment.
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true

// React Native reads __DEV__ at module load time; the node environment doesn't define it.
global.__DEV__ = true

// Provide a placeholder key so the API key guard in claudeService doesn't throw in tests.
// Tests that call the service mock fetch directly and never hit the real API.
process.env.EXPO_PUBLIC_CLAUDE_API_KEY = 'test-key'
