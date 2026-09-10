module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['node_modules/', 'android/', 'ios/'],
  rules: {
    // Allow console.warn/error for the deliberate diagnostics in the
    // storage and auth layers; console.log stays out of shipped code.
    'no-console': ['warn', {allow: ['warn', 'error']}],
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.{js,jsx}', 'jest.setup.js'],
      env: {jest: true},
    },
  ],
};
