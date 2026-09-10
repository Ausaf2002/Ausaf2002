import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Builds a fake axios adapter.
 *
 * A custom adapter has to reject on a failure status itself: `validateStatus`
 * is applied inside axios's built-in adapters, not in the shared request
 * pipeline. Rejecting with an error that carries `response` reproduces what
 * the real adapter hands to the response interceptor.
 *
 * @param {(config: object) => {status: number, data?: object}} handler
 * @returns {(config: object) => Promise<object>}
 */
function makeAdapter(handler) {
  return config =>
    Promise.resolve().then(() => {
      const result = handler(config);
      const response = {
        data: result.data,
        status: result.status,
        statusText: '',
        headers: {},
        config,
      };

      if (result.status >= 200 && result.status < 300) {
        return response;
      }

      throw Object.assign(new Error(`Request failed with status code ${result.status}`), {
        response,
        config,
        isAxiosError: true,
      });
    });
}

describe('api client', () => {
  beforeEach(() => {
    // api.js caches the token in module scope, so each test needs a fresh copy.
    jest.resetModules();
    AsyncStorage.clear();
  });

  it('uses the base URL from the config file', () => {
    const config = require('../src/config').default;
    const api = require('../src/services/api').default;

    expect(api.defaults.baseURL).toBe(config.apiBaseUrl);
  });

  it('attaches the bearer token set via setAuthToken', async () => {
    const {default: api, setAuthToken} = require('../src/services/api');
    let seen = null;

    api.defaults.adapter = makeAdapter(requestConfig => {
      seen = requestConfig.headers.Authorization;
      return {status: 200, data: {success: true}};
    });

    setAuthToken('token-abc');
    await api.get('/api/auth/me');

    expect(seen).toBe('Bearer token-abc');
  });

  it('falls back to stored token for requests made before the session is restored', async () => {
    // `jest.resetModules()` gives the mock a fresh in-memory store, so the
    // token has to be written through the same instance the client will read.
    const storage = require('@react-native-async-storage/async-storage').default;
    await storage.setItem('@pantrio/auth-token', 'token-from-disk');

    const {default: api} = require('../src/services/api');
    let seen = null;

    api.defaults.adapter = makeAdapter(requestConfig => {
      seen = requestConfig.headers.Authorization;
      return {status: 200, data: {success: true}};
    });

    await api.get('/api/auth/me');

    expect(seen).toBe('Bearer token-from-disk');
  });

  it('sends no Authorization header when signed out', async () => {
    const {default: api, setAuthToken} = require('../src/services/api');
    let seen = 'unset';

    api.defaults.adapter = makeAdapter(requestConfig => {
      seen = requestConfig.headers.Authorization;
      return {status: 200, data: {success: true}};
    });

    setAuthToken(null);
    await api.get('/health');

    expect(seen).toBeUndefined();
  });

  it('turns the server error envelope into an ApiError', async () => {
    const {default: api, ApiError} = require('../src/services/api');

    api.defaults.adapter = makeAdapter(() => ({
      status: 409,
      data: {
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with that email already exists.',
          field: 'email',
        },
      },
    }));

    await expect(api.post('/api/auth/register', {})).rejects.toMatchObject({
      code: 'EMAIL_EXISTS',
      message: 'An account with that email already exists.',
      field: 'email',
    });

    await expect(api.post('/api/auth/register', {})).rejects.toBeInstanceOf(ApiError);
  });

  it('reports an unreachable server as NETWORK_ERROR', async () => {
    const {default: api} = require('../src/services/api');

    api.defaults.adapter = () => Promise.reject(Object.assign(new Error('boom'), {config: {}}));

    await expect(api.get('/health')).rejects.toMatchObject({code: 'NETWORK_ERROR'});
  });

  it('reports a timeout as TIMEOUT', async () => {
    const {default: api} = require('../src/services/api');

    api.defaults.adapter = () =>
      Promise.reject(Object.assign(new Error('timeout'), {code: 'ECONNABORTED', config: {}}));

    await expect(api.get('/health')).rejects.toMatchObject({code: 'TIMEOUT'});
  });

  it('falls back to a generic message when the body is not an envelope', async () => {
    const {default: api} = require('../src/services/api');

    api.defaults.adapter = makeAdapter(() => ({status: 502, data: '<html>Bad Gateway</html>'}));

    await expect(api.get('/health')).rejects.toMatchObject({code: 'INTERNAL_ERROR'});
  });

  describe('session expiry', () => {
    it('signs the user out when an authenticated request returns 401', async () => {
      const {default: api, setUnauthorizedHandler} = require('../src/services/api');
      const onUnauthorized = jest.fn();
      setUnauthorizedHandler(onUnauthorized);

      api.defaults.adapter = makeAdapter(() => ({
        status: 401,
        data: {error: {code: 'INVALID_CREDENTIALS', message: 'Expired.'}},
      }));

      await expect(api.get('/api/auth/me')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('does not sign the user out when login itself returns 401', async () => {
      const {default: api, setUnauthorizedHandler} = require('../src/services/api');
      const onUnauthorized = jest.fn();
      setUnauthorizedHandler(onUnauthorized);

      api.defaults.adapter = makeAdapter(() => ({
        status: 401,
        data: {error: {code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.'}},
      }));

      await expect(api.post('/api/auth/login', {})).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
      expect(onUnauthorized).not.toHaveBeenCalled();
    });
  });
});
