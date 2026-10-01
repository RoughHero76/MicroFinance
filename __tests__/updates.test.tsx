// App updates: optional updates show a sheet whose "Later" snoozes that
// version for 3 days; mandatory ones (below the server's minimum version)
// show a full screen with no way past it, remembered across restarts.

import React from 'react';
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpdateGate from '@/features/app/UpdateGate';
import UpdateSheet from '@/features/app/UpdateSheet';
import {UpdateProvider, compareVersions} from '@/features/app/updates';
import {SessionProvider} from '@/features/auth/SessionProvider';
import i18n from '@/i18n';
import {api} from '@/lib/api';
import {ThemeProvider} from '@/theme';

let checkReply: object;

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await AsyncStorage.clear();
  await AsyncStorage.multiSet([
    ['user', JSON.stringify({uid: 'e1', fname: 'Meena', lname: 'Shah', role: 'employee'})],
    ['token', 't'],
    ['isLoggedIn', 'true'],
    ['settings.appLock', JSON.stringify({enabled: false, afterMs: 60000})],
  ]);
  jest.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/shared/app/update/check') return checkReply as never;
    if (url === '/shared/settings') return {data: {minPayment: 100, modules: {}}} as never;
    throw new Error(`unexpected GET ${url}`);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function renderApp() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return render(
    <SafeAreaProvider>
      <ThemeProvider initial={{palette: 'evi', mode: 'light'}}>
        <QueryClientProvider client={client}>
          <SessionProvider>
            <UpdateProvider>
              <BottomSheetModalProvider>
                <UpdateSheet />
                <UpdateGate />
              </BottomSheetModalProvider>
            </UpdateProvider>
          </SessionProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('compareVersions', () => {
  it('compares each part as a number', () => {
    expect(compareVersions('1.0.10', '1.0.9')).toBe(1);
    expect(compareVersions('v1.0.5', '1.0.5')).toBe(0);
    expect(compareVersions('1.0', '1.0.1')).toBe(-1);
  });
});

describe('updates', () => {
  it('optional: a sheet that "Later" snoozes for this version', async () => {
    checkReply = {updateAvailable: true, latestVersion: '1.0.6', notes: ['Faster lists'], mandatory: false};
    renderApp();
    await waitFor(() => expect(screen.getByText('A new version is ready')).toBeTruthy());
    expect(screen.queryByText('Update required')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByText('Later'));
    });
    const snooze = JSON.parse((await AsyncStorage.getItem('updateSnooze')) as string);
    expect(snooze.version).toBe('1.0.6');
    expect(snooze.until).toBeGreaterThan(Date.now() + 2 * 24 * 60 * 60 * 1000);
  });

  it('mandatory: a full screen with no Later, remembered for the next start', async () => {
    checkReply = {updateAvailable: true, latestVersion: '1.0.6', minVersion: '1.0.5', mandatory: true};
    renderApp();
    await waitFor(() => expect(screen.getByText('Update required')).toBeTruthy());
    expect(screen.getByText('Update now')).toBeTruthy();
    expect(screen.queryByText('Later')).toBeNull();
    const saved = JSON.parse((await AsyncStorage.getItem('updateRequired')) as string);
    expect(saved.minVersion).toBe('1.0.5');
  });

  it('a remembered mandatory update still blocks when the check fails (offline)', async () => {
    await AsyncStorage.setItem('updateRequired', JSON.stringify({latestVersion: '1.0.6', minVersion: '1.0.5'}));
    jest.spyOn(api, 'get').mockImplementation(async () => {
      throw new Error('offline');
    });
    renderApp();
    await waitFor(() => expect(screen.getByText('Update required')).toBeTruthy());
  });
});
