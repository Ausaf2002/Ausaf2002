import {Platform} from 'react-native';

/**
 * Single source of truth for anything environment-specific.
 *
 * Nothing outside this file should contain a URL or a tunable timeout, so
 * pointing the app at a different backend is a one-line change here.
 *
 * When the app moves to per-build configuration, swap the constants below for
 * `react-native-config` (a `.env` file consumed at build time) — the shape of
 * the exported object can stay exactly the same.
 */

/**
 * Where the API lives during development.
 *
 * The Android emulator runs in its own network namespace, so `localhost`
 * points at the emulator itself rather than the developer's machine; 10.0.2.2
 * is the host loopback alias. iOS simulators share the host network and can
 * use localhost directly.
 *
 * Testing on a physical device? Replace this with your machine's LAN address,
 * e.g. 'http://192.168.1.50:4000'.
 */
const DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:4000',
  ios: 'http://localhost:4000',
  default: 'http://localhost:4000',
});

/** Where the API lives in release builds. */
const PROD_API_URL = 'https://api.pantrio.app';

const config = {
  /** Base URL for every request made through `src/services/api.js`. */
  apiBaseUrl: __DEV__ ? DEV_API_URL : PROD_API_URL,

  /**
   * Request timeout in milliseconds. Long enough to absorb a cold start on a
   * free-tier host, short enough that a dead network surfaces as an error
   * instead of an indefinite spinner.
   */
  requestTimeoutMs: 15000,
};

export default config;
