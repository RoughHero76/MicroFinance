// Employee account items (round E): the employee's own password (E-02),
// own contact details (E-08), login history (E-13), the A16 profile with
// today's numbers (E-04, E-05), the A15 list (E-07), moving loans (E-01)
// and offline payments (E-12), against mocked replies.

import React from 'react';
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SessionProvider} from '@/features/auth/SessionProvider';
import SecurityScreen from '@/features/settings/screens/SecurityScreen';
import i18n from '@/i18n';
import {api} from '@/lib/api';
import {ThemeProvider} from '@/theme';
import {ToastHost} from '@/ui';

type Replies = Record<string, unknown>;
let gets: Replies = {};
let putSpy: jest.SpiedFunction<typeof api.put>;
let postSpy: jest.SpiedFunction<typeof api.post>;

async function signIn(role: 'admin' | 'employee') {
  await AsyncStorage.multiSet([
    ['user', JSON.stringify({uid: 'u1', fname: 'Meena', lname: 'Shah', role})],
    ['token', 't'],
    ['isLoggedIn', 'true'],
    ['settings.appLock', JSON.stringify({enabled: false, afterMs: 60000})],
  ]);
}

beforeEach(async () => {
  gets = {'/shared/settings': {data: {minPayment: 100, modules: {leads: true, cashHandover: true}}}};
  await i18n.changeLanguage('en');
  await AsyncStorage.clear();
  jest.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url in gets) return gets[url] as never;
    throw new Error(`unexpected GET ${url}`);
  });
  putSpy = jest.spyOn(api, 'put').mockImplementation(async () => ({status: 'success'}) as never);
  postSpy = jest.spyOn(api, 'post').mockImplementation(async () => ({status: 'success'}) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const Stack = createNativeStackNavigator();
function renderScreen(Component: React.ComponentType, params?: object) {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
  return render(
    <SafeAreaProvider>
      <ThemeProvider initial={{palette: 'evi', mode: 'light'}}>
        <QueryClientProvider client={client}>
          <SessionProvider>
            <BottomSheetModalProvider>
              <NavigationContainer>
                <Stack.Navigator screenOptions={{headerShown: false}}>
                  <Stack.Screen name="Main" component={Component} initialParams={params} />
                </Stack.Navigator>
              </NavigationContainer>
              <ToastHost />
            </BottomSheetModalProvider>
          </SessionProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('E-02 employee changes their own password', () => {
  it('shows My account to employees and sends to the employee route', async () => {
    await signIn('employee');
    renderScreen(SecurityScreen);
    await waitFor(() => expect(screen.getByText('My account')).toBeTruthy());
    expect(screen.queryByText('Admins only')).toBeNull();
    fireEvent.press(screen.getAllByText('Change my password')[0]);
    fireEvent.changeText(screen.getByLabelText('Current password'), 'Old@1234');
    fireEvent.changeText(screen.getByLabelText('New password'), 'New@5678');
    fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'New@5678');
    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });
    expect(putSpy).toHaveBeenCalledWith('/employee/password', {currentPassword: 'Old@1234', newPassword: 'New@5678'});
  });

  it('refuses a weak password before sending', async () => {
    await signIn('employee');
    renderScreen(SecurityScreen);
    await waitFor(() => expect(screen.getByText('My account')).toBeTruthy());
    fireEvent.press(screen.getAllByText('Change my password')[0]);
    fireEvent.changeText(screen.getByLabelText('Current password'), 'Old@1234');
    fireEvent.changeText(screen.getByLabelText('New password'), 'weakpass');
    fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'weakpass');
    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });
    expect(putSpy).not.toHaveBeenCalled();
  });
});
