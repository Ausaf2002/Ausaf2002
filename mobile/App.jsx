import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {colors} from './src/theme';

/**
 * Application root.
 *
 * Provider order matters: SafeAreaProvider supplies insets to the navigator,
 * and AuthProvider must sit above AppNavigator because the navigator decides
 * which stack to render from the auth state.
 *
 * @returns {JSX.Element}
 */
function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
