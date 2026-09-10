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
import {validateLoginForm} from '../utils/validators';

/**
 * Sign-in screen.
 *
 * On success it does not navigate explicitly: setting the token flips
 * `isAuthenticated`, and AppNavigator swaps the auth stack for the app stack.
 * That keeps "am I signed in?" as the single source of navigation truth and
 * makes it impossible to land on the dashboard without a session.
 *
 * @param {{navigation: {navigate: (screen: string) => void}}} props
 * @returns {JSX.Element}
 */
function LoginScreen({navigation}) {
  const {login} = useAuth();

  const [values, setValues] = useState({email: '', password: ''});
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRef = useRef(null);

  // Mirrors `isSubmitting`, but updates synchronously. Two taps in the same
  // tick would both read the old `isSubmitting` — state changes are not
  // visible until the next render — and fire two requests.
  const submittingRef = useRef(false);

  /**
   * Updates one field and clears any error already shown for it, so the
   * message disappears as soon as the user starts fixing the problem.
   *
   * @param {'email'|'password'} field
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
   * Validates locally, then asks the server for a token.
   */
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) {
      return;
    }

    const errors = validateLoginForm(values);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    submittingRef.current = true;
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      await login(values.email, values.password);
      // Navigation is handled by AppNavigator reacting to the new token.
    } catch (error) {
      // Errors carrying a field belong under that input; everything else
      // (bad credentials, rate limiting, no network) goes in the banner.
      if (error.field) {
        setFieldErrors({[error.field]: error.message});
      } else {
        setFormError(error.message);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [login, values]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>Pantrio</Text>
          <Text style={styles.subtitle}>Welcome back. Sign in to your pantry.</Text>
        </View>

        <ErrorBanner message={formError} />

        <FormField
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
          error={fieldErrors.password}
          editable={!isSubmitting}
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />

        <View style={styles.actions}>
          <PrimaryButton title="Sign in" onPress={handleSubmit} loading={isSubmitting} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Pantrio?</Text>
          <Pressable
            onPress={() => navigation.navigate('Register')}
            disabled={isSubmitting}
            accessibilityRole="button">
            <Text style={styles.footerLink}>Create an account</Text>
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
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: typography.title + 6,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.subtitle,
    color: colors.textSecondary,
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

export default LoginScreen;
