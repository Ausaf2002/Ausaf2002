import React from 'react';
import {Text} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';

import api from '../src/services/api';
import {AuthProvider, useAuth} from '../src/context/AuthContext';
import LoginScreen from '../src/screens/LoginScreen';
import RegisterScreen from '../src/screens/RegisterScreen';

/**
 * Replaces the transport under the real axios instance, so these tests
 * exercise the actual interceptors, context, and screens — everything except
 * the socket.
 *
 * @param {(config: object) => {status: number, data?: object}} handler
 */
function mockNetwork(handler) {
  api.defaults.adapter = config =>
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

      // A custom adapter is responsible for rejecting on a failure status;
      // axios only applies `validateStatus` inside its built-in adapters.
      throw Object.assign(new Error(`Request failed with status code ${result.status}`), {
        response,
        config,
        isAxiosError: true,
      });
    });
}

const SUCCESS_BODY = {
  success: true,
  data: {
    userId: 'user-1',
    email: 'sam@example.com',
    displayName: 'Sam',
    token: 'jwt-token-123',
  },
};

const navigation = {navigate: jest.fn()};

/**
 * Writes a session to storage as if the user had signed in on a previous run.
 *
 * @param {string} token
 * @returns {Promise<void>}
 */
async function seedStoredSession(token) {
  await AsyncStorage.setItem('@pantrio/auth-token', token);
  await AsyncStorage.setItem(
    '@pantrio/auth-user',
    JSON.stringify({userId: 'user-1', email: 'sam@example.com', displayName: 'Sam'}),
  );
}

/** Surfaces auth state as text so tests can assert on it. */
function AuthProbe() {
  const {isAuthenticated, user} = useAuth();

  if (!isAuthenticated) {
    return <Text>signed-out</Text>;
  }

  return <Text>{`signed-in:${user ? user.displayName : 'unknown'}`}</Text>;
}

/**
 * Renders a screen inside a real AuthProvider.
 *
 * @param {React.ReactNode} ui
 * @returns {Promise<void>}
 */
async function renderWithAuth(ui) {
  await render(
    <AuthProvider>
      {ui}
      <AuthProbe />
    </AuthProvider>,
  );
}

/**
 * Fills in a form field by its label.
 *
 * @param {string} label
 * @param {string} value
 * @returns {Promise<void>}
 */
async function type(label, value) {
  await fireEvent.changeText(screen.getByLabelText(label), value);
}

/**
 * Presses a button by its visible label.
 *
 * @param {string} name
 * @returns {Promise<void>}
 */
async function press(name) {
  await fireEvent.press(screen.getByRole('button', {name}));
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('LoginScreen', () => {
  it('validates before making any request', async () => {
    const adapter = jest.fn();
    api.defaults.adapter = adapter;

    await renderWithAuth(<LoginScreen navigation={navigation} />);
    await press('Sign in');

    expect(screen.getByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Password is required.')).toBeTruthy();
    expect(adapter).not.toHaveBeenCalled();
  });

  it('shows an inline error for a malformed email', async () => {
    await renderWithAuth(<LoginScreen navigation={navigation} />);

    await type('Email', 'not-an-email');
    await type('Password', 'Pantry1!');
    await press('Sign in');

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
  });

  it('signs in, stores the session, and exposes it through the context', async () => {
    let requestBody = null;
    mockNetwork(config => {
      requestBody = JSON.parse(config.data);
      return {status: 200, data: SUCCESS_BODY};
    });

    await renderWithAuth(<LoginScreen navigation={navigation} />);

    await type('Email', 'sam@example.com');
    await type('Password', 'Pantry1!');
    await press('Sign in');

    expect(await screen.findByText('signed-in:Sam')).toBeTruthy();
    expect(requestBody).toEqual({email: 'sam@example.com', password: 'Pantry1!'});
    expect(await AsyncStorage.getItem('@pantrio/auth-token')).toBe('jwt-token-123');
  });

  it('shows the server message when credentials are wrong', async () => {
    mockNetwork(() => ({
      status: 401,
      data: {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Incorrect email or password.',
          field: null,
        },
      },
    }));

    await renderWithAuth(<LoginScreen navigation={navigation} />);

    await type('Email', 'sam@example.com');
    await type('Password', 'Wrong1!');
    await press('Sign in');

    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
    expect(await AsyncStorage.getItem('@pantrio/auth-token')).toBeNull();
    expect(screen.getByText('signed-out')).toBeTruthy();
  });

  it('surfaces a network failure without leaving the button spinning', async () => {
    api.defaults.adapter = () =>
      Promise.reject(Object.assign(new Error('offline'), {config: {}}));

    await renderWithAuth(<LoginScreen navigation={navigation} />);

    await type('Email', 'sam@example.com');
    await type('Password', 'Pantry1!');
    await press('Sign in');

    expect(
      await screen.findByText('Cannot reach Pantrio. Check your connection and try again.'),
    ).toBeTruthy();
    // The button is interactive again, so the user can retry.
    expect(screen.getByRole('button', {name: 'Sign in'})).toBeEnabled();
  });

  it('sends exactly one request per submission', async () => {
    let calls = 0;
    mockNetwork(() => {
      calls += 1;
      return {status: 200, data: SUCCESS_BODY};
    });

    await renderWithAuth(<LoginScreen navigation={navigation} />);

    await type('Email', 'sam@example.com');
    await type('Password', 'Pantry1!');
    await press('Sign in');

    expect(calls).toBe(1);
  });
});

describe('RegisterScreen', () => {
  /**
   * Fills every field on the signup form.
   *
   * @param {{password?: string, confirmPassword?: string}} overrides
   * @returns {Promise<void>}
   */
  async function fillForm({password = 'Pantry1!', confirmPassword = 'Pantry1!'} = {}) {
    await type('Display name', 'Sam');
    await type('Email', 'sam@example.com');
    await type('Password', password);
    await type('Confirm password', confirmPassword);
  }

  it('blocks submission when the passwords do not match', async () => {
    const adapter = jest.fn();
    api.defaults.adapter = adapter;

    await renderWithAuth(<RegisterScreen navigation={navigation} />);
    await fillForm({confirmPassword: 'Pantry2!'});
    await press('Create account');

    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    expect(adapter).not.toHaveBeenCalled();
  });

  it('blocks submission when the password is too weak', async () => {
    const adapter = jest.fn();
    api.defaults.adapter = adapter;

    await renderWithAuth(<RegisterScreen navigation={navigation} />);
    await fillForm({password: 'pantry', confirmPassword: 'pantry'});
    await press('Create account');

    expect(screen.getByText('Password must include at least one uppercase letter.')).toBeTruthy();
    expect(adapter).not.toHaveBeenCalled();
  });

  it('creates an account and signs the new user in', async () => {
    let requestBody = null;
    mockNetwork(config => {
      requestBody = JSON.parse(config.data);
      return {status: 201, data: SUCCESS_BODY};
    });

    await renderWithAuth(<RegisterScreen navigation={navigation} />);

    await type('Display name', '  Sam  ');
    await type('Email', '  sam@example.com ');
    await type('Password', 'Pantry1!');
    await type('Confirm password', 'Pantry1!');
    await press('Create account');

    expect(await screen.findByText('signed-in:Sam')).toBeTruthy();
    // Surrounding whitespace is trimmed before the request goes out.
    expect(requestBody).toEqual({
      displayName: 'Sam',
      email: 'sam@example.com',
      password: 'Pantry1!',
    });
  });

  it('puts a duplicate-email error under the email field', async () => {
    mockNetwork(() => ({
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

    await renderWithAuth(<RegisterScreen navigation={navigation} />);
    await fillForm();
    await press('Create account');

    expect(await screen.findByText('An account with that email already exists.')).toBeTruthy();
  });
});

describe('session restore', () => {
  it('restores a stored session on launch', async () => {
    await seedStoredSession('stored-token');
    mockNetwork(() => ({status: 200, data: {success: true, data: SUCCESS_BODY.data}}));

    await renderWithAuth(null);

    expect(await screen.findByText('signed-in:Sam')).toBeTruthy();
  });

  it('sends the restored token on the verification request', async () => {
    await seedStoredSession('stored-token');

    let authorization = null;
    mockNetwork(config => {
      authorization = config.headers.Authorization;
      return {status: 200, data: {success: true, data: SUCCESS_BODY.data}};
    });

    await renderWithAuth(null);

    await waitFor(() => expect(authorization).toBe('Bearer stored-token'));
  });

  it('keeps the cached session when the verification request fails offline', async () => {
    await seedStoredSession('stored-token');

    api.defaults.adapter = () =>
      Promise.reject(Object.assign(new Error('offline'), {config: {url: '/api/auth/me'}}));

    await renderWithAuth(null);

    expect(await screen.findByText('signed-in:Sam')).toBeTruthy();
    expect(await AsyncStorage.getItem('@pantrio/auth-token')).toBe('stored-token');
  });

  it('signs the user out when the stored token has expired', async () => {
    await seedStoredSession('expired-token');

    mockNetwork(() => ({
      status: 401,
      data: {
        success: false,
        error: {code: 'INVALID_CREDENTIALS', message: 'Session expired.', field: null},
      },
    }));

    await renderWithAuth(null);

    expect(await screen.findByText('signed-out')).toBeTruthy();
    await waitFor(async () => {
      expect(await AsyncStorage.getItem('@pantrio/auth-token')).toBeNull();
    });
  });

  it('starts signed out when nothing is stored', async () => {
    const adapter = jest.fn();
    api.defaults.adapter = adapter;

    await renderWithAuth(null);

    expect(await screen.findByText('signed-out')).toBeTruthy();
    expect(adapter).not.toHaveBeenCalled();
  });
});
