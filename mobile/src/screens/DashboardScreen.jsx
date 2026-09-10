import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
// react-native's own SafeAreaView is deprecated and iOS-only; the
// safe-area-context version works on both platforms.
import {SafeAreaView} from 'react-native-safe-area-context';
import PrimaryButton from '../components/PrimaryButton';
import {useAuth} from '../context/AuthContext';
import {colors, radius, spacing, typography} from '../theme';

/**
 * Placeholder home screen for a signed-in user.
 *
 * Stands in for the real pantry list. Its job right now is to prove the
 * session survived and to provide a way out of it.
 *
 * @returns {JSX.Element}
 */
function DashboardScreen() {
  const {user, logout} = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Clears the token, which flips AppNavigator back to the login screen.
   */
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      // Guard against setting state after the screen unmounts, which it does
      // as soon as the token clears.
      setIsLoggingOut(false);
    }
  }, [logout]);

  return (
    // The navigator draws the header, so only the bottom edge needs insetting.
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View>
          <Text style={styles.greeting}>Hi {user?.displayName || 'there'}</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your pantry</Text>
            <Text style={styles.cardBody}>
              Nothing here yet. Inventory tracking and expiry reminders arrive in the next
              milestone — for now, this screen just confirms you are signed in.
            </Text>
          </View>
        </View>

        <PrimaryButton
          title="Log out"
          variant="outline"
          onPress={handleLogout}
          loading={isLoggingOut}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  greeting: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.subtitle,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  cardBody: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 21,
  },
});

export default DashboardScreen;
