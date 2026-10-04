// Admins send their own message: to all employees by default, or to chosen
// employees; it asks first, then reports how many people and phones.

import React from 'react';
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import SendNotificationScreen from '@/features/notifications/screens/SendNotificationScreen';
import i18n from '@/i18n';
import {api} from '@/lib/api';
import {ThemeProvider} from '@/theme';
import {ToastHost} from '@/ui';

let postSpy: jest.SpiedFunction<typeof api.post>;

beforeEach(async () => {
  await i18n.changeLanguage('en');
  jest.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/admin/employee') {
      return {
        data: [
          {_id: 'E1', uid: 'u1', fname: 'Meena', lname: 'Shah', accountStatus: true},
          {_id: 'E2', uid: 'u2', fname: 'Arif', lname: 'Khan', accountStatus: true},
        ],
      } as never;
    }
    throw new Error(`unexpected GET ${url}`);
  });
  postSpy = jest
    .spyOn(api, 'post')
    .mockResolvedValue({data: {recipients: 2, push: {configured: true, sent: 2}}} as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const Stack = createNativeStackNavigator();
function renderScreen() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return render(
    <SafeAreaProvider>
      <ThemeProvider initial={{palette: 'evi', mode: 'light'}}>
        <QueryClientProvider client={client}>
          <BottomSheetModalProvider>
            <NavigationContainer>
              <Stack.Navigator screenOptions={{headerShown: false}}>
                <Stack.Screen name="Send" component={SendNotificationScreen} />
              </Stack.Navigator>
            </NavigationContainer>
            <ToastHost />
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('Send notification', () => {
  it('sends to all employees after asking', async () => {
    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Title'), 'Office closed tomorrow');
    fireEvent.changeText(screen.getByLabelText('Message (optional)'), 'Back Monday');
    fireEvent.press(screen.getAllByText('Send')[0]);
    await waitFor(() => expect(screen.getByText('Send to All employees?')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getAllByText('Send')[0]);
    });
    expect(postSpy).toHaveBeenCalledWith('/shared/notifications/send', {
      to: 'employees',
      title: 'Office closed tomorrow',
      message: 'Back Monday',
    });
    await waitFor(() => expect(screen.getByText('Sent to 2 people')).toBeTruthy());
  });

  it('sends only to the chosen employees', async () => {
    renderScreen();
    fireEvent.press(screen.getByText('Choose employees'));
    await waitFor(() => expect(screen.getByText('Meena Shah')).toBeTruthy());
    fireEvent.press(screen.getByText('Meena Shah'));
    await waitFor(() => expect(screen.getByText('1 employee')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Title'), 'Collect from Sunita today');
    fireEvent.press(screen.getAllByText('Send')[0]);
    await waitFor(() => expect(screen.getByText('Send to 1 employee?')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getAllByText('Send')[0]);
    });
    expect(postSpy).toHaveBeenCalledWith('/shared/notifications/send', expect.objectContaining({to: ['E1']}));
  });
});
