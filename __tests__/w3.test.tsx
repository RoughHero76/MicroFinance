// W3 admin loans and payments: close-loan bounds, the edit-installment
// fields, and the Payments screen (grouping by collector, approve with Undo,
// reject with a reason, approve a whole group) against mocked replies.

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
import AdminHomeScreen from '@/features/dashboard/screens/AdminHomeScreen';
import {fieldsFor} from '@/features/loans/components/EditInstallmentSheet';
import {useCollect} from '@/features/loans/components/CollectSheets';
import {paymentBounds} from '@/features/loans/screens/CloseLoanScreen';
import type {Loan} from '@/features/loans/types';
import PaymentsScreen from '@/features/payments/screens/PaymentsScreen';
import i18n from '@/i18n';
import {api} from '@/lib/api';
import {ThemeProvider} from '@/theme';
import {Text, ToastHost} from '@/ui';

describe('close-loan bounds', () => {
  const loan = {outstandingAmount: 20000, totalPenaltyAmount: 600, advanceBalance: 200} as Loan;

  it('needs principal and penalties minus advance credit', () => {
    expect(paymentBounds(loan, {forgiveLoan: false, forgivePenalties: false})).toMatchObject({min: 20400, max: 20400});
  });

  it('drops penalties when they are forgiven, and the minimum when the loan is', () => {
    expect(paymentBounds(loan, {forgiveLoan: false, forgivePenalties: true}).min).toBe(19800);
    expect(paymentBounds(loan, {forgiveLoan: true, forgivePenalties: false})).toMatchObject({min: 0, max: 20400});
  });
});

describe('edit installment fields', () => {
  it('asks for what each change of status needs', () => {
    expect(fieldsFor('Pending', 'Paid')).toEqual(['date', 'collector']);
    expect(fieldsFor('Pending', 'PartiallyPaid')).toEqual(['date', 'amount', 'method', 'collector']);
    expect(fieldsFor('Pending', 'Overdue')).toEqual(['penalty']);
    expect(fieldsFor('Overdue', 'OverduePaid')).toEqual(['date', 'amount', 'method', 'collector']);
    expect(fieldsFor('Paid', 'Pending')).toEqual([]);
    expect(fieldsFor('Paid', 'Paid')).toEqual([]);
  });
});

const pending = (id: string, amount: number, collector: {_id: string; name: string} | null, borrower: string) => ({
  _id: id,
  amount,
  paymentDate: new Date().toISOString(),
  paymentMethod: 'Cash',
  status: 'Pending',
  balanceAfterPayment: 32060,
  logicNote: 'Split across #10 and #11',
  collectedBy: collector?.name ?? 'N/A',
  collector,
  loan: {_id: `loan-${id}`, loanNumber: '1039', loanAmount: 25000},
  loanDetails: {loanAmount: 25000, borrower, outstandingAmount: 32060},
});

const meena = {_id: 'e1', name: 'Meena S.'};
const approvals = [
  pending('r1', 4580, meena, 'Sunita Devi'),
  pending('r2', 1000, meena, 'Ramesh Kumar'),
  pending('r3', 1150, null, 'Kavita Rao'),
];

let postSpy: jest.SpiedFunction<typeof api.post>;
// Payments the fake server has approved, so a refetch leaves them out.
const approvedIds = new Set<string>();

beforeEach(async () => {
  approvedIds.clear();
  await i18n.changeLanguage('en');
  await AsyncStorage.clear();
  await AsyncStorage.multiSet([
    ['user', JSON.stringify({uid: 'a1', fname: 'Arif', lname: 'Khan', role: 'admin'})],
    ['token', 't'],
    ['isLoggedIn', 'true'],
    ['settings.appLock', JSON.stringify({enabled: false, afterMs: 60000})],
  ]);
  jest.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/admin/loan/repayment/history/approve')
      return {
        data: approvals.filter(a => !approvedIds.has(a._id)),
        pagination: {page: 1, pages: 1, total: 3},
      } as never;
    if (url === '/admin/employee')
      return {
        data: [
          {_id: 'e1', fname: 'Meena', lname: 'S.'},
          {_id: 'e2', fname: 'Arjun', lname: 'P.'},
        ],
      } as never;
    if (url === '/shared/settings') return {data: {minPayment: 100, modules: {leads: true}}} as never;
    if (url === '/admin/dashboard') {
      return {
        data: {
          loanCount: 128,
          newLeads: 4,
          pendingRepayments: 9,
          pendingLoans: 2,
          collectedToday: {amount: 21300, count: 9},
          marketDetails: {totalMarketAmount: 1840000, totalMarketAmountRepaid: 620000},
          customerCount: 342,
          recentCustomers: [
            {_id: 'c1', uid: 'u1', fname: 'Sunita', lname: 'Devi', loans: [{loanAmount: 25000, status: 'Active'}]},
          ],
        },
      } as never;
    }
    throw new Error(`unexpected GET ${url}`);
  });
  postSpy = jest.spyOn(api, 'post').mockImplementation(async (url: string, body: any) => {
    if (url.endsWith('/approve-many')) return {data: {approved: body.repaymentIds, skipped: 0, amount: 5580}} as never;
    if (url.endsWith('/history/approve')) approvedIds.add(body.repaymentId);
    if (url.endsWith('/history/unapprove')) approvedIds.delete(body.repaymentId);
    return {status: 'success'} as never;
  });
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

describe('A1 admin Home', () => {
  it('shows market amount, counts and the pending-loans notice', async () => {
    renderScreen(AdminHomeScreen);
    // A-01: the money starts hidden; the counts don't.
    await waitFor(() => expect(screen.getByText('128')).toBeTruthy());
    expect(screen.getByText('₹ • • • • • •')).toBeTruthy();
    expect(screen.queryByText('₹18,40,000')).toBeNull();
    fireEvent.press(screen.getByLabelText('Show amounts'));
    expect(screen.getByText('₹18,40,000')).toBeTruthy();
    expect(screen.getByLabelText('Hide amounts')).toBeTruthy();
    expect(screen.getByText('342')).toBeTruthy();
    expect(screen.getByText('2 loans waiting for approval')).toBeTruthy();
    expect(screen.getByText('Sunita Devi')).toBeTruthy();
  });
});

describe('A12 Payments', () => {
  it('groups by collector, with admin-recorded payments in their own group', async () => {
    renderScreen(PaymentsScreen);
    await waitFor(() => expect(screen.getByText('Meena S.')).toBeTruthy());
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('₹5,580')).toBeTruthy();
    expect(screen.getByText('Approve all 2 (₹5,580)')).toBeTruthy();
    expect(screen.getAllByText('Split across #10 and #11').length).toBe(3);
  });

  it('approves with an Undo that moves it back to pending', async () => {
    renderScreen(PaymentsScreen);
    await waitFor(() => expect(screen.getByText('Sunita Devi')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getAllByText('Approve')[0]);
    });
    expect(postSpy).toHaveBeenCalledWith('/admin/loan/repayment/history/approve', {repaymentId: 'r1'});
    await waitFor(() => expect(screen.getByText('Undo')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Undo'));
    });
    expect(postSpy).toHaveBeenCalledWith('/admin/loan/repayment/history/unapprove', {repaymentId: 'r1'});
  });

  it('takes an approved payment out of the list at once and puts it back on Undo (W7)', async () => {
    renderScreen(PaymentsScreen);
    await waitFor(() => expect(screen.getByText('Sunita Devi')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getAllByText('Approve')[0]);
    });
    await waitFor(() => expect(screen.queryByText('Sunita Devi')).toBeNull());
    await waitFor(() => expect(screen.getByText('Undo')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Undo'));
    });
    await waitFor(() => expect(screen.getByText('Sunita Devi')).toBeTruthy());
  });

  it('needs a reason to reject', async () => {
    renderScreen(PaymentsScreen);
    await waitFor(() => expect(screen.getByText('Sunita Devi')).toBeTruthy());
    fireEvent.press(screen.getAllByText('Reject')[0]);
    await waitFor(() => expect(screen.getByText('Reject ₹4,580 from Sunita Devi?')).toBeTruthy());
    const buttons = screen.getAllByText('Reject');
    fireEvent.press(buttons[buttons.length - 1]);
    expect(postSpy).not.toHaveBeenCalledWith('/admin/loan/repayment/history/reject', expect.anything());
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Wrong transaction ID'), 'Wrong txn');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });
    expect(postSpy).toHaveBeenCalledWith('/admin/loan/repayment/history/reject', {
      repaymentId: 'r1',
      reason: 'Wrong txn',
    });
  });

  it('approves a whole collector group in one request (P-14)', async () => {
    renderScreen(PaymentsScreen);
    await waitFor(() => expect(screen.getByText('Approve all 2 (₹5,580)')).toBeTruthy());
    fireEvent.press(screen.getByText('Approve all 2 (₹5,580)'));
    await waitFor(() => expect(screen.getByText('Approve 2 payments from Meena S.?')).toBeTruthy());
    const approve = screen.getAllByText('Approve');
    await act(async () => {
      fireEvent.press(approve[approve.length - 1]);
    });
    expect(postSpy).toHaveBeenCalledWith('/admin/loan/repayment/history/approve-many', {repaymentIds: ['r1', 'r2']});
  });
});

describe('admin records a payment', () => {
  function Pay() {
    const collect = useCollect();
    return (
      <>
        <Text
          onPress={() =>
            collect.pay({
              loanId: 'l1',
              loanNumber: '1039',
              installmentId: 'i1',
              installmentAmount: 1065,
              dueAmount: 1065,
              customerName: 'Sunita Devi',
              assignedTo: {_id: 'e2'},
            })
          }>
          Collect
        </Text>
        {collect.sheets}
      </>
    );
  }

  it("lists the loan's own employee first in Collected by, marked", async () => {
    renderScreen(Pay);
    fireEvent.press(await screen.findByText('Collect'));
    await waitFor(() => expect(screen.getByText('Assigned to this loan')).toBeTruthy());
    const names = screen.getAllByText(/^(Meena S\.|Arjun P\.)$/).map(n => n.props.children);
    expect(names).toEqual(['Arjun P.', 'Meena S.']);
  });
});
