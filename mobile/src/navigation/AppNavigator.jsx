import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import DashboardScreen from '../screens/DashboardScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import {colors} from '../theme';

const Stack = createNativeStackNavigator();

/**
 * Shown while the stored session is being read from disk. Without it the
 * login screen would flash before an already signed-in user reached the
 * dashboard.
 *
 * @returns {JSX.Element}
 */
function SplashScreen() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

/**
 * Root navigator.
 *
 * The two stacks are mutually exclusive by construction: the signed-out user
 * has no dashboard route to navigate to, and the signed-in user has no login
 * route. Because the screens are conditionally mounted, React Navigation
 * resets history on the switch, so logging out cannot be undone with the
 * hardware back button.
 *
 * @returns {JSX.Element}
 */
function AppNavigator() {
  const {isAuthenticated, isRestoring} = useAuth();

  if (isRestoring) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {backgroundColor: colors.primary},
          headerTintColor: colors.textOnPrimary,
          headerTitleStyle: {fontWeight: '600'},
          contentStyle: {backgroundColor: colors.background},
        }}>
        {isAuthenticated ? (
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{title: 'Pantrio'}}
          />
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{title: 'Sign up'}}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default AppNavigator;
