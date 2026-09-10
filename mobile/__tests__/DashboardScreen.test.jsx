import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';

import api from '../src/services/api';
import {AuthProvider} from '../src/context/AuthContext';
import DashboardScreen from '../src/screens/DashboardScreen';

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('@pantrio/auth-token', 'jwt-token-123');
  await AsyncStorage.setItem(
    '@pantrio/auth-user',
    JSON.stringify({userId: 'user-1', email: 'sam@example.com', displayName: 'Sam'}),
  );

  // The provider verifies the restored token on mount; answer that call
  // rather than letting it fall through to a real request.
  api.defaults.adapter = config =>
    Promise.resolve({
      data: {
        success: true,
        data: {userId: 'user-1', email: 'sam@example.com', displayName: 'Sam'},
      },
      status: 200,
      statusText: '',
      headers: {},
      config,
    });
});

describe('DashboardScreen', () => {
  it('greets the signed-in user', async () => {
    await render(
      <AuthProvider>
        <DashboardScreen />
      </AuthProvider>,
    );

    expect(await screen.findByText('Hi Sam')).toBeTruthy();
    expect(screen.getByText('sam@example.com')).toBeTruthy();
  });

  it('clears the stored session when logging out', async () => {
    await render(
      <AuthProvider>
        <DashboardScreen />
      </AuthProvider>,
    );

    await screen.findByText('Hi Sam');
    await fireEvent.press(screen.getByRole('button', {name: 'Log out'}));

    await waitFor(async () => {
      expect(await AsyncStorage.getItem('@pantrio/auth-token')).toBeNull();
      expect(await AsyncStorage.getItem('@pantrio/auth-user')).toBeNull();
    });
  });
});
