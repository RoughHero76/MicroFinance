// W2 employee field flow against mocked server replies: Home numbers, the
// Collect list order and Done group, recording a payment (validation, the
// big-number check, receipt) and applying a penalty.

import React from 'react';
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Linking} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SessionProvider} from '@/features/auth/SessionProvider';
import {useNetInfo} from '@react-native-community/netinfo';
import {flushQueue, getQueue, loadQueue} from '@/features/collect/payQueue';
import CollectScreen from '@/features/collect/screens/CollectScreen';
import {ApiError} from '@/lib/api';
import EmployeeHomeScreen from '@/features/collect/screens/EmployeeHomeScreen';
import i18n from '@/i18n';
import {api} from '@/lib/api';
import {ThemeProvider} from '@/theme';
import {ToastHost} from '@/ui';

const today = new Date().toISOString();

const collections = [
  {
    _id: 's-due',
    dueDate: today,
    amount: 1065,
    originalAmount: 1065,
    status: 'Pending',
    loanInstallmentNumber: 11,
    done: false,
    loan: {
      _id: 'l1',
      loanAmount: 25000,
      loanNumber: '1039',
      customer: {_id: 'c1', fname: 'Sunita', lname: 'Devi', phoneNumber: '9876543210'},
    },
  },
  {
    _id: 's-over',
    dueDate: today,
    amount: 1240,
    originalAmount: 1240,
    status: 'Overdue',
    loanInstallmentNumber: 31,
    done: false,
    loan: {
      _id: 'l2',
      loanAmount: 50000,
      loanNumber: '1042',
      customer: {_id: 'c2', fname: 'Ramesh', lname: 'Kumar', phoneNumber: '9822055511'},
    },
  },
  {
    _id: 's-done',
    dueDate: today,
    amount: 500,
    originalAmount: 500,
    status: 'Paid',
    loanInstallmentNumber: 4,
    done: true,
    loan: {_id: 'l3', loanAmount: 10000, loanNumber: '1050', customer: {_id: 'c3', fname: 'Kavita', lname: 'Rao'}},
  },
];

const dashboard = {
  today: {
    dueCount: 12,
    scheduledCount: 14,
    amountScheduled: 38400,
    amountDue: 17100,
    amountCollected: 21300,
    paymentsCount: 9,
  },
  customersCount: 18,
  loans: {total: 20, active: 18},
  leads: {total: 14, pending: 4, inProgress: 3, approved: 5, rejected: 0, converted: 2, followUpsDue: 1},
  overdue: {sma0: 6, sma1: 2, sma2: 1, npa: 1, totalOverdue: 58400, loans: 10},
};

let postSpy: jest.SpiedFunction<typeof api.post>;

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await AsyncStorage.clear();
  await AsyncStorage.multiSet([
    ['user', JSON.stringify({_id: 'e1', fname: 'Meena', lname: 'Shah', role: 'employee'})],
    ['token', 't'],
    ['isLoggedIn', 'true'],
    ['settings.appLock', JSON.stringify({enabled: false, afterMs: 60000})],
  ]);
  jest.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/employee/loan/collection/today') return {data: collections} as never;
    if (url === '/employee/dashboard') return {data: dashboard} as never;
    if (url === '/shared/settings') return {data: {minPayment: 100, penaltyRate: 0.1, modules: {leads: true}}} as never;
    throw new Error(`unexpected GET ${url}`);
  });
  postSpy = jest.spyOn(api, 'post').mockImplementation(async (url: string, body: any) => {
    if (url === '/employee/loan/pay') {
      return {
        data: {
          repaymentDetails: {
            _id: '66f1a2b3c4d5e6f7a8r7f3k2',
            amount: body.amount,
            paymentDate: today,
            paymentMethod: body.paymentMethod,
            status: 'Pending',
          },
          balanceAfterPayment: 35575,
          outstandingAmount: 35575,
          installments: [11],
          loanNumber: '1039',
        },
      } as never;
    }
    if (url === '/employee/loan/apply/penalty') return {status: 'success'} as never;
    throw new Error(`unexpected POST ${url}`);
  });
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  (Linking.openURL as jest.Mock).mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const Stack = createNativeStackNavigator();

function renderScreen(Component: React.ComponentType) {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
  return render(
    <SafeAreaProvider>
      <ThemeProvider initial={{palette: 'evi', mode: 'light'}}>
        <QueryClientProvider client={client}>
          <SessionProvider>
            <BottomSheetModalProvider>
              <NavigationContainer>
                <Stack.Navigator screenOptions={{headerShown: false}}>
                  <Stack.Screen name="Main" component={Component} />
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

describe('E1 employee Home', () => {
  it('shows today’s collections, customers, leads and overdue buckets', async () => {
    renderScreen(EmployeeHomeScreen);
    await waitFor(() => expect(screen.getByText('12 due')).toBeTruthy());
    expect(screen.getByText('Welcome, Meena')).toBeTruthy();
    expect(screen.getByText('₹21,300 of ₹38,400 collected')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getByText('₹58,400 overdue')).toBeTruthy();
  });
});

describe('E2 Collect', () => {
  it('orders overdue first, due next, and puts collected rows in Done', async () => {
    renderScreen(CollectScreen);
    await waitFor(() => expect(screen.getByText('Ramesh Kumar')).toBeTruthy());
    expect(screen.getByText('2 due today')).toBeTruthy();
    const headers = screen.getAllByText(/ · \d$/).map(n => (n.props.children as string[]).join(''));
    expect(headers).toEqual(['Overdue · 1', 'Due today · 1', 'Done · 1']);
    expect(screen.getByLabelText('Due ₹1,065')).toBeTruthy();
  });

  it('records a payment and offers the SMS receipt', async () => {
    renderScreen(CollectScreen);
    await waitFor(() => expect(screen.getByText('Sunita Devi')).toBeTruthy());
    fireEvent.press(screen.getAllByText('Pay')[1]);
    await waitFor(() => expect(screen.getByText('Confirm ₹1,065')).toBeTruthy());
    expect(screen.getByText('One thousand sixty-five rupees')).toBeTruthy();
    expect(
      screen.getByText('Min ₹100. Anything above this installment goes to older dues first, then future ones.'),
    ).toBeTruthy();
    fireEvent.press(screen.getByText('Confirm ₹1,065'));
    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        '/employee/loan/pay',
        expect.objectContaining({amount: 1065, paymentMethod: 'Cash', repaymentScheduleId: 's-due'}),
      ),
    );
    await waitFor(() => expect(screen.getByText('₹1,065 recorded')).toBeTruthy());
    fireEvent.press(screen.getByText('SMS'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalled());
    const url = (Linking.openURL as jest.Mock).mock.calls.at(-1)![0] as string;
    // Android puts the body after '?', iOS (Jest's default platform) after '&'.
    expect(decodeURIComponent(url)).toMatch(/^sms:9876543210[?&]body=EviFinance: Rs1,065 recd for loan #1039/);
    expect(decodeURIComponent(url)).toContain('Bal Rs35,575. Ref R7F3K2');
  });

  it('refuses amounts below the minimum and checks big amounts once (P-17)', async () => {
    renderScreen(CollectScreen);
    await waitFor(() => expect(screen.getByText('Sunita Devi')).toBeTruthy());
    fireEvent.press(screen.getAllByText('Pay')[1]);
    const field = await screen.findByDisplayValue('1,065');
    fireEvent.changeText(field, '60');
    fireEvent.press(screen.getByText('Confirm ₹60'));
    expect(screen.getByText('Minimum is ₹100')).toBeTruthy();
    expect(postSpy).not.toHaveBeenCalled();

    fireEvent.changeText(field, '10650');
    fireEvent.press(screen.getByText('Confirm ₹10,650'));
    await waitFor(() => expect(screen.getByText('₹10,650 is 10× the installment. Continue?')).toBeTruthy());
    expect(postSpy).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByText('Continue'));
    });
    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith('/employee/loan/pay', expect.objectContaining({amount: 10650})),
    );
  });

  it('applies a penalty and opens the SMS app with the notice', async () => {
    renderScreen(CollectScreen);
    await waitFor(() => expect(screen.getByText('Sunita Devi')).toBeTruthy());
    fireEvent.press(screen.getAllByText('Penalty')[1]);
    const field = await screen.findByLabelText('Penalty amount');
    fireEvent.changeText(field, '300');
    fireEvent.press(screen.getByText('Apply ₹300'));
    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith('/employee/loan/apply/penalty', {
        loanId: 'l1',
        repaymentScheduleId: 's-due',
        penaltyAmount: 300,
      }),
    );
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalled());
    expect(decodeURIComponent((Linking.openURL as jest.Mock).mock.calls.at(-1)![0] as string)).toContain(
      'Late fee Rs300 on loan #1039',
    );
  });
});

describe('E-12 payments offline', () => {
  const online = {isConnected: true, isInternetReachable: true};

  afterEach(async () => {
    (useNetInfo as jest.Mock).mockReturnValue(online);
    await loadQueue(null);
  });

  it('saves a payment on the phone when offline, and marks the row Not sent yet', async () => {
    (useNetInfo as jest.Mock).mockReturnValue({isConnected: false, isInternetReachable: false});
    renderScreen(CollectScreen);
    await waitFor(() => expect(screen.getByText('Sunita Devi')).toBeTruthy());
    fireEvent.press(screen.getAllByText('Pay')[1]);
    await waitFor(() => expect(screen.getByText('Confirm ₹1,065')).toBeTruthy());
    fireEvent.press(screen.getByText('Confirm ₹1,065'));
    await waitFor(() => expect(screen.getByText('Not sent yet')).toBeTruthy());
    expect(postSpy).not.toHaveBeenCalledWith('/employee/loan/pay', expect.anything());
    const [saved] = getQueue();
    expect(saved).toMatchObject({amount: 1065, installmentId: 's-due', loanNumber: '1039', state: 'waiting'});
    expect(saved.clientRef).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });

  it('queues a payment whose send got no answer, with the same key', async () => {
    postSpy.mockImplementation(async () => {
      throw new ApiError('timeout');
    });
    renderScreen(CollectScreen);
    await waitFor(() => expect(screen.getByText('Sunita Devi')).toBeTruthy());
    fireEvent.press(screen.getAllByText('Pay')[1]);
    await waitFor(() => expect(screen.getByText('Confirm ₹1,065')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Confirm ₹1,065'));
    });
    await waitFor(() => expect(getQueue().length).toBe(1));
    const sentRef = (postSpy.mock.calls[0][1] as {clientRef: string}).clientRef;
    expect(getQueue()[0].clientRef).toBe(sentRef);
  });

  it('sends waiting payments in order; stops when offline; marks a refusal', async () => {
    await loadQueue(null);
    const {enqueue} = require('@/features/collect/payQueue');
    const base = {loanId: 'l1', installmentId: 's1', paymentMethod: 'Cash', customerName: 'A', loanNumber: '1', collectedAt: ''};
    enqueue({...base, clientRef: 'pAAAAAAAA1', amount: 100});
    enqueue({...base, clientRef: 'pAAAAAAAA2', amount: 200});
    enqueue({...base, clientRef: 'pAAAAAAAA3', amount: 300});
    const sent: string[] = [];
    let n = 0;
    const send = async (p: {clientRef: string}) => {
      n += 1;
      if (n === 2) throw new ApiError('http', {status: 400, serverMessage: 'Loan is closed'});
      if (n === 3) throw new ApiError('offline');
      sent.push(p.clientRef);
    };
    expect(await flushQueue(send as never)).toBe(1);
    expect(sent).toEqual(['pAAAAAAAA1']);
    expect(getQueue().map(p => [p.clientRef, p.state, p.error])).toEqual([
      ['pAAAAAAAA2', 'refused', 'Loan is closed'],
      ['pAAAAAAAA3', 'waiting', undefined],
    ]);
  });
});
