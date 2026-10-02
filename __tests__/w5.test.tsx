// W5 reports, risk, notifications, calculator and cash handover: text built
// from type + params (English and Hindi), where a tap goes, report ranges,
// the risk screen and its "run now", notifications with Read all, live
// calculator results, and the admin's shortfall rules.

import React from 'react';
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Text} from 'react-native';
import {SessionProvider} from '@/features/auth/SessionProvider';
import CashHandoversScreen from '@/features/cash/screens/CashHandoversScreen';
import CalculatorScreen from '@/features/loans/screens/CalculatorScreen';
import type {AppNotification} from '@/features/notifications/api';
import NotificationsScreen from '@/features/notifications/screens/NotificationsScreen';
import {notificationTarget, notificationText} from '@/features/notifications/text';
import {rangeLabel} from '@/features/reports/components/Bars';
import {sortRows} from '@/features/reports/screens/PerformanceScreen';
import {presetRange} from '@/features/reports/screens/ReportsScreen';
import RiskScreen from '@/features/reports/screens/RiskScreen';
import i18n from '@/i18n';
import {api} from '@/lib/api';
import {ThemeProvider} from '@/theme';
import {ToastHost} from '@/ui';

const note = (type: string, params: object, link?: object): AppNotification => ({
  _id: type,
  type,
  params: params as Record<string, unknown>,
  link,
  readAt: null,
  createdAt: new Date().toISOString(),
});

describe('notification text', () => {
  it('is written from type and params, in English and Hindi', async () => {
    await i18n.changeLanguage('en');
    const pending = note('payment.pending', {
      count: 9,
      byCollector: [
        {name: 'Meena S.', count: 6},
        {name: 'Admin', count: 3},
      ],
    });
    expect(notificationText(pending, i18n.t)).toEqual({
      title: '9 payments need approval',
      body: 'Meena S. 6 · Admin 3',
    });
    const rejected = note('payment.rejected', {
      amount: 1150,
      name: 'Kavita Rao',
      loanNo: '1060',
      reason: 'Wrong txn ID',
    });
    expect(notificationText(rejected, i18n.t)).toEqual({
      title: 'Payment rejected · ₹1,150',
      body: 'Kavita Rao #1060 · "Wrong txn ID"',
    });
    await i18n.changeLanguage('hi');
    expect(notificationText(note('lead.assigned', {name: 'Imran'}), i18n.t).title).toBe('नई लीड सौंपी गई · Imran');
    await i18n.changeLanguage('en');
  });

  it('falls back to the server copy for unknown types', () => {
    const n = {...note('something.new', {}), title: 'Server title', body: 'Server body'};
    expect(notificationText(n, i18n.t)).toEqual({title: 'Server title', body: 'Server body'});
  });

  it('opens the linked loan, lead or list', () => {
    expect(notificationTarget(note('x', {}, {screen: 'Loan', id: 'L1'}))).toEqual(['Loan', {loanId: 'L1'}]);
    expect(notificationTarget(note('x', {}, {screen: 'Leads'}))).toEqual(['Tabs', {screen: 'Leads'}]);
    expect(notificationTarget(note('x', {}))).toBeNull();
  });
});

describe('reports', () => {
  it('turns presets into date ranges', () => {
    const now = new Date(2026, 8, 30);
    const [a, b] = presetRange('lastMonth', now);
    expect([a.getMonth(), a.getDate(), b.getMonth(), b.getDate()]).toEqual([7, 1, 7, 31]);
    expect(presetRange('threeMonths', now)[0].getMonth()).toBe(6);
  });

  it('labels the distribution buckets', () => {
    expect(rangeLabel('0-9999', 10000)).toBe('<₹10k');
    expect(rangeLabel('10000-19999', 10000)).toBe('₹10k–20k');
    expect(rangeLabel('1000-1099', 100)).toBe('₹1k–1.1k');
  });

  it('sorts performance rows', () => {
    const row = (name: string, percent: number | null, collected: number, overdueLoans: number) => ({
      employee: {_id: name, uid: name, name},
      due: 100,
      collected,
      percent,
      overdueLoans,
    });
    const rows = [row('a', 78, 102000, 6), row('m', 93, 184300, 0), row('r', null, 0, 1)];
    expect(sortRows(rows, 'percent').map(r => r.employee.name)).toEqual(['m', 'a', 'r']);
    expect(sortRows(rows, 'overdue').map(r => r.employee.name)).toEqual(['a', 'r', 'm']);
  });
});

let postSpy: jest.SpiedFunction<typeof api.post>;

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await AsyncStorage.clear();
  await AsyncStorage.multiSet([
    ['user', JSON.stringify({uid: 'a1', fname: 'Arif', lname: 'Khan', role: 'admin'})],
    ['token', 't'],
    ['isLoggedIn', 'true'],
    ['settings.appLock', JSON.stringify({enabled: false, afterMs: 60000})],
  ]);
  jest.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/shared/settings')
      return {
        data: {minPayment: 100, gracePeriod: 0, defaultInterestRate: 3.38, modules: {leads: true, cashHandover: true}},
      } as never;
    if (url === '/shared/loan/status/overview') {
      return {
        data: {
          activeLoans: 128,
          overdueLoans: 22,
          totalOverdue: 58400,
          averageOverdue: 2655,
          buckets: {
            sma0: {count: 11, overdue: 21300},
            sma1: {count: 5, overdue: 16200},
            sma2: {count: 2, overdue: 9900},
            npa: {count: 4, overdue: 11000},
          },
          thresholds: {sma0: 5, sma1: 10, sma2: 15},
          lastRun: {at: '2026-09-29T17:34:00Z', status: 'success'},
        },
      } as never;
    }
    if (url === '/shared/notifications') {
      return {
        data: [
          note('payment.pending', {count: 9, byCollector: [{name: 'Meena S.', count: 9}]}, {screen: 'Payments'}),
          {...note('lead.assigned', {name: 'Imran Shaikh'}), readAt: new Date().toISOString()},
        ],
        meta: {page: 1, totalPages: 1, total: 2},
      } as never;
    }
    if (url === '/admin/cash/handovers') {
      return {
        data: [
          {
            _id: 'h1',
            employee: {_id: 'e1', fname: 'Meena', lname: 'S.'},
            amount: 14200,
            cashCount: 6,
            status: 'Submitted',
            createdAt: new Date().toISOString(),
          },
        ],
        meta: {totalPages: 1, total: 1},
      } as never;
    }
    throw new Error(`unexpected GET ${url}`);
  });
  postSpy = jest.spyOn(api, 'post').mockImplementation(async (url: string) => {
    if (url === '/shared/loan/calculate') {
      return {
        data: {
          loanEndDate: '2027-07-27',
          numberOfInstallments: 43,
          repaymentAmountPerInstallment: 1065,
          totalRepaymentAmount: 45795,
        },
      } as never;
    }
    if (url === '/shared/loan/repayment/schedule/update')
      return {data: {lastRunAt: new Date().toISOString(), lastStatus: 'success'}} as never;
    return {status: 'success'} as never;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const Stack = createNativeStackNavigator();
function Probe({route}: {route: {name: string; params?: object}}) {
  return <Text>{`at ${route.name} ${JSON.stringify(route.params ?? {})}`}</Text>;
}
function renderScreen(Component: React.ComponentType<any>) {
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
                  {['Overdue', 'Payments', 'Search'].map(name => (
                    <Stack.Screen key={name} name={name} component={Probe} />
                  ))}
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

describe('A18 risk', () => {
  it('shows the 4 figures and each level, opening its loans', async () => {
    renderScreen(RiskScreen);
    await waitFor(() => expect(screen.getByText('128')).toBeTruthy());
    expect(screen.getByText('3.1% (4)')).toBeTruthy();
    expect(screen.getByText('SMA-1 · 5')).toBeTruthy();
    expect(screen.getByText('10+ missed installments')).toBeTruthy();
    fireEvent.press(screen.getByText('NPA · 4'));
    await waitFor(() => expect(screen.getByText('at Overdue {"bucket":"npa"}')).toBeTruthy());
  });

  it("runs tonight's update after a confirmation", async () => {
    renderScreen(RiskScreen);
    await waitFor(() => expect(screen.getByText('128')).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Run tonight's update now"));
    await waitFor(() => expect(screen.getByText("Run tonight's update now?")).toBeTruthy());
    const buttons = screen.getAllByText("Run tonight's update now");
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });
    expect(postSpy).toHaveBeenCalledWith('/shared/loan/repayment/schedule/update', {}, {timeout: 120000});
  });
});

describe('X5 notifications', () => {
  it('lists them by day and marks all read', async () => {
    renderScreen(NotificationsScreen);
    await waitFor(() => expect(screen.getByText('9 payments need approval')).toBeTruthy());
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('New lead assigned · Imran Shaikh')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText('Read all'));
    });
    expect(postSpy).toHaveBeenCalledWith('/shared/notifications/read-all');
  });

  it('a tap marks it read and opens its screen', async () => {
    renderScreen(NotificationsScreen);
    await waitFor(() => expect(screen.getByText('9 payments need approval')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('9 payments need approval'));
    });
    expect(postSpy).toHaveBeenCalledWith('/shared/notifications/payment.pending/read');
    await waitFor(() => expect(screen.getByText('at Payments {}')).toBeTruthy());
  });
});

describe('X7 calculator', () => {
  it('shows results as you type', async () => {
    renderScreen(CalculatorScreen);
    await waitFor(() =>
      expect(screen.getByText('Enter the amount and duration to see the installments.')).toBeTruthy(),
    );
    fireEvent.changeText(screen.getAllByLabelText(/Loan amount/)[0], '25000');
    fireEvent.press(screen.getAllByText('300 days')[0]);
    await waitFor(() => expect(screen.getByText('₹1,065')).toBeTruthy(), {timeout: 3000});
    expect(screen.getByText('43')).toBeTruthy();
    expect(screen.getByText('₹45,795')).toBeTruthy();
  });
});

describe('M-3 cash handovers (admin)', () => {
  it('a shortfall needs less than the amount and a note', async () => {
    renderScreen(CashHandoversScreen);
    await waitFor(() => expect(screen.getByText('Meena S.')).toBeTruthy());
    fireEvent.press(screen.getByText('Short…'));
    await act(async () => {
      fireEvent.press(screen.getByText('Record shortfall'));
    });
    expect(screen.getByText('Enter less than ₹14,200, or tap Received')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText(/Amount received/), '14000');
    await act(async () => {
      fireEvent.press(screen.getByText('Record shortfall'));
    });
    expect(screen.getByText('A note is required for a shortfall')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText(/^Note/), 'Counted twice');
    await act(async () => {
      fireEvent.press(screen.getByText('Record shortfall'));
    });
    expect(postSpy).toHaveBeenCalledWith('/admin/cash/handovers/h1/confirm', {
      receivedAmount: 14000,
      note: 'Counted twice',
    });
  });

  it('Received confirms the whole amount', async () => {
    renderScreen(CashHandoversScreen);
    await waitFor(() => expect(screen.getByText('Meena S.')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Received'));
    });
    expect(postSpy).toHaveBeenCalledWith('/admin/cash/handovers/h1/confirm', {});
  });
});
