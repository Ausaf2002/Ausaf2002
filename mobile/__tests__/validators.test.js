import {
  validateConfirmPassword,
  validateDisplayName,
  validateEmail,
  validateLoginForm,
  validatePassword,
  validateRegisterForm,
} from '../src/utils/validators';

describe('validateEmail', () => {
  it.each(['sam@example.com', 'sam+pantry@example.co.uk', '  sam@example.com  '])(
    'accepts %s',
    value => {
      expect(validateEmail(value)).toBeNull();
    },
  );

  it.each([
    ['', 'Email is required.'],
    ['   ', 'Email is required.'],
    ['not-an-email', 'Enter a valid email address.'],
    ['sam@', 'Enter a valid email address.'],
    ['sam @example.com', 'Enter a valid email address.'],
  ])('rejects %p', (value, expected) => {
    expect(validateEmail(value)).toBe(expected);
  });
});

describe('validateDisplayName', () => {
  it('accepts a normal name', () => {
    expect(validateDisplayName('Sam')).toBeNull();
  });

  it('rejects whitespace only', () => {
    expect(validateDisplayName('   ')).toBe('Display name is required.');
  });

  it('rejects a single character', () => {
    expect(validateDisplayName('S')).toBe('Display name must be at least 2 characters.');
  });

  it('rejects more than 60 characters', () => {
    expect(validateDisplayName('a'.repeat(61))).toBe(
      'Display name must be 60 characters or fewer.',
    );
  });
});

describe('validatePassword', () => {
  it('accepts a password meeting every rule', () => {
    expect(validatePassword('Pantry1!')).toBeNull();
  });

  it('accepts the minimum length when all rules are met', () => {
    expect(validatePassword('Pan1!x')).toBeNull();
  });

  it.each([
    ['', 'Password is required.'],
    ['Ab1!', 'Password must be at least 6 characters.'],
    ['pantry1!', 'Password must include at least one uppercase letter.'],
    ['Pantry!!', 'Password must include at least one number.'],
    ['Pantry11', 'Password must include at least one special character.'],
  ])('rejects %p', (value, expected) => {
    expect(validatePassword(value)).toBe(expected);
  });

  it('counts a space as a special character, matching the server', () => {
    expect(validatePassword('Pantry 1')).toBeNull();
  });
});

describe('validateConfirmPassword', () => {
  it('accepts a match', () => {
    expect(validateConfirmPassword('Pantry1!', 'Pantry1!')).toBeNull();
  });

  it('rejects a mismatch', () => {
    expect(validateConfirmPassword('Pantry1!', 'Pantry2!')).toBe('Passwords do not match.');
  });

  it('rejects an empty confirmation', () => {
    expect(validateConfirmPassword('Pantry1!', '')).toBe('Please confirm your password.');
  });
});

describe('validateRegisterForm', () => {
  it('returns no errors for a valid form', () => {
    expect(
      validateRegisterForm({
        displayName: 'Sam',
        email: 'sam@example.com',
        password: 'Pantry1!',
        confirmPassword: 'Pantry1!',
      }),
    ).toEqual({});
  });

  it('reports every invalid field at once', () => {
    const errors = validateRegisterForm({
      displayName: '',
      email: 'nope',
      password: 'weak',
      confirmPassword: 'different',
    });

    expect(Object.keys(errors).sort()).toEqual([
      'confirmPassword',
      'displayName',
      'email',
      'password',
    ]);
  });
});

describe('validateLoginForm', () => {
  it('returns no errors for a valid form', () => {
    expect(validateLoginForm({email: 'sam@example.com', password: 'anything'})).toEqual({});
  });

  it('does not apply the signup password policy', () => {
    // An account predating a policy change must still be able to sign in.
    expect(validateLoginForm({email: 'sam@example.com', password: 'weak'})).toEqual({});
  });

  it('requires a password', () => {
    expect(validateLoginForm({email: 'sam@example.com', password: ''})).toEqual({
      password: 'Password is required.',
    });
  });
});
