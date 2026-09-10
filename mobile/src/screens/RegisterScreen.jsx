import React, {useCallback, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ErrorBanner from '../components/ErrorBanner';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import {useAuth} from '../context/AuthContext';
import {colors, spacing, typography} from '../theme';
import {
  PASSWORD_MIN_LENGTH,
  validateConfirmPassword,
  validatePassword,
  validateRegisterForm,
} from '../utils/validators';

const INITIAL_VALUES = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

/**
 * Account creation screen.
 *
 * Validates against the same rules as the server before sending anything, so
 * a mistyped password costs no round trip. As on the login screen, success
 * navigates implicitly: the new token flips AppNavigator over to the app
 * stack.
 *
 * @param {{navigation: {navigate: (screen: string) => void}}} props
 * @returns {JSX.Element}
 */
function RegisterScreen({navigation}) {
  const {register} = useAuth();

  const [values, setValues] = useState(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // Synchronous double-submit guard; see LoginScreen for why state alone is
  // not enough.
  const submittingRef = useRef(false);

  /**
   * Updates one field and clears its error as soon as the user edits it.
   *
   * @param {'displayName'|'email'|'password'|'confirmPassword'} field
   * @returns {(text: string) => void}
   */
  const handleChange = useCallback(
    field => text => {
      setValues(current => ({...current, [field]: text}));
      setFieldErrors(current => (current[field] ? {...current, [field]: null} : current));
      setFormError(null);
    },
    [],
  );

  /**
   * Validates a single field once the user leaves it, which surfaces a weak
   * password while they can still see what they typed rather than at submit.
   *
   * @param {'password'|'confirmPassword'} field
   * @returns {() => void}
   */
  const handleBlur = useCallback(
    field => () => {
      const error =
        field === 'password'
          ? validatePassword(values.password)
          : validateConfirmPassword(values.password, values.confirmPassword);

      // Only surface a blur error for a field the user has actually filled
      // in; nagging about an empty field they merely tabbed through is rude.
      if (values[field]) {
        setFieldErrors(current => ({...current, [field]: error}));
      }
    },
    [values],
  );

  /**
   * Validates the whole form, then creates the account.
   */
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) {
      return;
    }

    const errors = validateRegisterForm(values);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    submittingRef.current = true;
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      await register({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
      });
      // AppNavigator switches to the dashboard once the token lands.
    } catch (error) {
      if (error.field) {
        setFieldErrors({[error.field]: error.message});
      } else {
        setFormError(error.message);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [register, values]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>Create your account</Text>
          <Text style={styles.subtitle}>
            Track what is in your pantry and never lose food to a missed expiry date again.
          </Text>
        </View>

        <ErrorBanner message={formError} />

        <FormField
          label="Display name"
          value={values.displayName}
          onChangeText={handleChange('displayName')}
          error={fieldErrors.displayName}
          editable={!isSubmitting}
          placeholder="Sam"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />

        <FormField
          inputRef={emailRef}
          label="Email"
          value={values.email}
          onChangeText={handleChange('email')}
          error={fieldErrors.email}
          editable={!isSubmitting}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <FormField
          inputRef={passwordRef}
          label="Password"
          value={values.password}
          onChangeText={handleChange('password')}
          onBlur={handleBlur('password')}
          error={fieldErrors.password}
          editable={!isSubmitting}
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
        />

        {/* Shown only while the field is clean, so it never competes with an
            actual error message in the same slot. */}
        {!fieldErrors.password && (
          <Text style={styles.hint}>
            {`Minimum ${PASSWORD_MIN_LENGTH} characters, with an uppercase letter, a number, and a special character.`}
          </Text>
        )}

        <FormField
          inputRef={confirmPasswordRef}
          label="Confirm password"
          value={values.confirmPassword}
          onChangeText={handleChange('confirmPassword')}
          onBlur={handleBlur('confirmPassword')}
          error={fieldErrors.confirmPassword}
          editable={!isSubmitting}
          placeholder="Re-enter your password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />

        <View style={styles.actions}>
          <PrimaryButton title="Create account" onPress={handleSubmit} loading={isSubmitting} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable
            onPress={() => navigation.navigate('Login')}
            disabled={isSubmitting}
            accessibilityRole="button">
            <Text style={styles.footerLink}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  logo: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  hint: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  actions: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginRight: spacing.xs + 2,
  },
  footerLink: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default RegisterScreen;
