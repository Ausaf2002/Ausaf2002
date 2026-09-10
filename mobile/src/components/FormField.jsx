import React, {useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';

/**
 * A labelled text input with an inline error slot.
 *
 * The error area keeps its height whether or not a message is showing, so
 * validating a field does not shift the rest of the form down the screen.
 *
 * @param {{
 *   label: string,
 *   value: string,
 *   onChangeText: (text: string) => void,
 *   error?: string|null,
 *   editable?: boolean,
 *   inputRef?: React.RefObject<import('react-native').TextInput>,
 * } & import('react-native').TextInputProps} props
 * @returns {JSX.Element}
 */
function FormField({
  label,
  value,
  onChangeText,
  error,
  editable = true,
  // Taken as a named prop rather than a forwarded `ref` so that "focus the
  // next field" works the same regardless of React version.
  inputRef,
  ...inputProps
}) {
  const [isFocused, setIsFocused] = useState(false);

  const inputStyles = [
    styles.input,
    isFocused && styles.inputFocused,
    Boolean(error) && styles.inputError,
    !editable && styles.inputDisabled,
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        ref={inputRef}
        style={inputStyles}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        editable={editable}
        placeholderTextColor={colors.placeholder}
        // Screen readers announce the message as part of the field rather
        // than as a stray line of text.
        accessibilityLabel={label}
        accessibilityHint={error || undefined}
        {...inputProps}
      />

      <View style={styles.errorSlot}>
        {Boolean(error) && (
          <Text style={styles.errorText} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.label,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.borderFocused,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputDisabled: {
    backgroundColor: colors.surface,
    color: colors.textSecondary,
  },
  // Reserved height stops the layout jumping when a message appears.
  errorSlot: {
    minHeight: 20,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: typography.caption,
    color: colors.danger,
  },
});

export default FormField;
