import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import PrimaryButton from '../src/components/PrimaryButton';

describe('PrimaryButton', () => {
  it('calls onPress when idle', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Sign in" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', {name: 'Sign in'}));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('swallows presses while loading, so a request cannot be fired twice', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Sign in" onPress={onPress} loading />);

    const button = screen.getByRole('button');
    await fireEvent.press(button);
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    // Announces the in-flight request to screen readers.
    expect(button.props.accessibilityState.busy).toBe(true);
  });

  it('swallows presses while disabled', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Sign in" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByRole('button', {name: 'Sign in'}));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('replaces the label with a spinner while loading', async () => {
    await render(<PrimaryButton title="Sign in" onPress={jest.fn()} loading />);

    expect(screen.queryByText('Sign in')).toBeNull();
  });
});
