import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';

/**
 * Form-level error message, for failures that belong to no single field —
 * wrong credentials, a dead network, a server fault.
 *
 * Renders nothing when `message` is empty, so callers can mount it
 * unconditionally.
 *
 * @param {{message?: string|null}} props
 * @returns {JSX.Element|null}
 */
function ErrorBanner({message}) {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.banner} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FDECEA',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  text: {
    color: colors.danger,
    fontSize: typography.caption,
    lineHeight: 18,
  },
});

export default ErrorBanner;
