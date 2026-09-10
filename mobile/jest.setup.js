/**
 * Jest setup shared by every test file.
 *
 * AsyncStorage is a native module with no JavaScript implementation in the
 * test environment, so it is replaced with the in-memory mock the package
 * ships under its `/jest` subpath export.
 */

/* eslint-env jest, node */
/* global globalThis */

// Tells React it is running under a test renderer, so state updates outside
// act() are reported as errors instead of silently racing.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

// Safe-area insets come from a native module; the shipped mock reports a
// fixed, iPhone-like inset so layout code has real numbers to work with.
// The mock nests everything under `default`, so it has to be unwrapped for
// named imports such as `SafeAreaView` to resolve.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
