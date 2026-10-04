// Screens shown before the navigator exists (first-login permissions, lock)
// must render without React Navigation. Regression: W7's Screen asked for
// the navigation object and crashed the permissions screen on a fresh install.

import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import {render, screen} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import PermissionsScreen from '@/features/auth/screens/PermissionsScreen';
import {ThemeProvider} from '@/theme';
import {Screen, Text} from '@/ui';

function wrap(node: React.ReactNode) {
  return render(
    <SafeAreaProvider>
      <ThemeProvider initial={{palette: 'evi', mode: 'light'}}>{node}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('outside the navigator', () => {
  it('renders the first-login permissions screen', () => {
    wrap(<PermissionsScreen onDone={jest.fn()} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders a Screen with a header and deferred content', async () => {
    wrap(
      <Screen header={{title: 'Hello'}} defer scroll>
        <Text>Body</Text>
      </Screen>,
    );
    expect(screen.getByText('Hello')).toBeTruthy();
    // No navigator, so nothing to wait for: the content shows at once.
    expect(screen.getByText('Body')).toBeTruthy();
  });
});
