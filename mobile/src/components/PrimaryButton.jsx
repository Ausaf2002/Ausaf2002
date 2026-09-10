import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';

/**
 * The app's primary call-to-action button.
 *
 * While `loading` is true the button is disabled and shows a spinner, which
 * is what stops a double tap firing two registrations.
 *
 * @param {{
 *   title: string,
 *   onPress: () => void,
 *   loading?: boolean,
 *   disabled?: boolean,
 *   variant?: 'primary'|'outline',
 * }} props
 * @returns {JSX.Element}
 */
function PrimaryButton({title, onPress, loading = false, disabled = false, variant = 'primary'}) {
  const isDisabled = disabled || loading;
  const isOutline = variant === 'outline';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{disabled: isDisabled, busy: loading}}
      style={({pressed}) => [
        styles.button,
        isOutline && styles.buttonOutline,
        pressed && !isDisabled && (isOutline ? styles.outlinePressed : styles.pressed),
        isDisabled && (isOutline ? styles.outlineDisabled : styles.disabled),
      ]}>
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.primary : colors.textOnPrimary} />
      ) : (
        <Text style={[styles.label, isOutline && styles.labelOutline]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    // Fixed height so swapping the label for a spinner does not resize it.
    minHeight: 52,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  pressed: {
    backgroundColor: colors.primaryDark,
  },
  outlinePressed: {
    backgroundColor: colors.surface,
  },
  disabled: {
    backgroundColor: colors.primaryMuted,
  },
  outlineDisabled: {
    borderColor: colors.primaryMuted,
  },
  label: {
    color: colors.textOnPrimary,
    fontSize: typography.subtitle,
    fontWeight: '600',
  },
  labelOutline: {
    color: colors.primary,
  },
});

export default PrimaryButton;
