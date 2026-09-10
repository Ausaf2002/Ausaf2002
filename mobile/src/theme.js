/**
 * Design tokens.
 *
 * Screens import from here rather than writing literal colours or spacing
 * values, so a palette change lands in one place.
 */

export const colors = {
  /** Pantrio green — primary actions and focus states. */
  primary: '#4CAF50',
  primaryDark: '#3B8C3F',
  primaryMuted: '#A5D6A7',

  danger: '#D32F2F',

  background: '#FFFFFF',
  surface: '#F5F7F5',
  border: '#DDE3DD',
  borderFocused: '#4CAF50',

  textPrimary: '#1B1F1B',
  textSecondary: '#5F6B5F',
  textOnPrimary: '#FFFFFF',
  placeholder: '#9AA69A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
};

export const typography = {
  title: 28,
  subtitle: 16,
  body: 15,
  label: 14,
  caption: 13,
};
