// W4 customers, employees, leads and search: lead progress, the forms'
// validation, lead chips with counts, approve-and-convert, the employee's
// one main action, remove with Undo, and recent customers on Search.

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
import CustomerFormScreen from '@/features/customers/screens/CustomerFormScreen';
import SearchScreen from '@/features/customers/screens/SearchScreen';
import type {Lead} from '@/features/leads/api';
import LeadDetailScreen, {leadStep} from '@/features/leads/screens/LeadDetailScreen';
import LeadListScreen from '@/features/leads/screens/LeadListScreen';
import EmployeeProfileScreen from '@/features/staff/screens/EmployeeProfileScreen';
import {passwordOk} from '@/features/staff/screens/EmployeeFormScreen';
import i18n from '@/i18n';
import {api} from '@/lib/api';
import {StorageKeys} from '@/lib/storage';
import {ThemeProvider} from '@/theme';
import {ToastHost} from '@/ui';

const baseLead: Lead = {
  _id: 'l1',
  name: 'Pooja Jain',
  phone: '9876543210',
  address: '12 MG Road',
  city: 'Pune',
  state: 'MH',
  loanType: 'Gold',
  loanAmount: 45000,
  loanDuration: '200 days',
  loanPurpose: 'Shop stock',
  status: 'Pending',
  followupStatus: 'Pending',
  followupDate: new Date().toISOString(),
  addedBy: {_id: 'e1', fname: 'Meena', lname: 'S.'},
  AssignedTo: {_id: 'e1', fname: 'Meena', lname: 'S.'},
  remarks: [{by: 'employee', kind: 'conversion', text: 'Docs collected, shop verified', at: new Date().toISOString()}],
};

describe('lead progress', () => {
  it('maps a lead onto Added → Follow-up → Requested → Approved → Customer', () => {
    expect(leadStep(baseLead)).toEqual({current: 1, failed: false});
    expect(leadStep({...baseLead, followupStatus: 'Completed'}).current).toBe(2);
    expect(leadStep({...baseLead, conversionRequested: true}).current).toBe(2);
    expect(leadStep({...baseLead, status: 'Approved'}).current).toBe(3);
    expect(leadStep({...baseLead, status: 'Rejected'})).toEqual({current: 3, failed: true});
    expect(leadStep({...baseLead, status: 'Approved', isLeadConverted: true}).current).toBe(4);
  });
});

describe('employee password rules', () => {
  it('matches the server (8+, upper, lower, digit, symbol)', () => {
    expect(passwordOk('Meena@2024')).toBe(true);
    expect(passwordOk('meena@2024')).toBe(false);
    expect(passwordOk('Meena2024')).toBe(false);
    expect(passwordOk('Me@1')).toBe(false);
  });
});

let lead: Lead = baseLead;
let postSpy: jest.SpiedFunction<typeof api.post>;
let patchSpy: jest.SpiedFunction<typeof api.patch>;
let deleteSpy: jest.SpiedFunction<typeof api.delete>;

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
    if (url === '/shared/settings') return {data: {minPayment: 100, modules: {leads: true}}} as never;
    if (url === '/admin/lead' || url === '/employee/lead') {
      return {
        data: {
          leads: [lead, {...baseLead, _id: 'l2', name: 'Imran Shaikh', status: 'InProgress', AssignedTo: null}],
          stats: {
            total: 46,
            pending: 12,
            inProgress: 9,
            approved: 18,
            rejected: 4,
            converted: 7,
            conversionRequested: 2,
          },
        },
        pagination: {totalLeads: 2, totalPages: 1, currentPage: 1},
      } as never;
    }
    if (url === '/admin/lead/l1' || url === '/employee/lead/l1') return {data: lead} as never;
    if (url === '/admin/employee')
      return {data: [{_id: 'e1', uid: 'u-e1', fname: 'Meena', lname: 'S.'}], total: 1} as never;
    if (url === '/admin/employee/profile') {
      return {
        data: {
          _id: 'e1',
          uid: 'u-e1',
          fname: 'Meena',
          lname: 'Shah',
          userName: 'meena',
          phoneNumber: '9000000001',
          emergencyContact: '9000000002',
          createdAt: '2024-01-10T00:00:00Z',
          lastLogin: null,
          stats: {assignedLoans: 14, activeLoans: 9, repaymentsCollected: 230},
        },
      } as never;
    }
    throw new Error(`unexpected GET ${url}`);
  });
  postSpy = jest.spyOn(api, 'post').mockImplementation(async (url: string) => {
    if (url === '/admin/customer') return {data: {_id: 'c9', uid: 'u-c9'}} as never;
    if (url === '/shared/search') {
      return {
        data: {
          customers: [
            {
              _id: 'c1',
              uid: 'u1',
              name: 'Sunita Devi',
              phoneNumber: '9876543210',
              loanCount: 1,
              loans: [{_id: 'L1', loanNumber: '1039', loanAmount: 25000, status: 'Active'}],
            },
          ],
        },
      } as never;
    }
    return {status: 'success'} as never;
  });
  patchSpy = jest.spyOn(api, 'patch').mockResolvedValue({status: 'success'} as never);
  deleteSpy = jest.spyOn(api, 'delete').mockResolvedValue({status: 'success'} as never);
});

afterEach(() => {
  jest.restoreAllMocks();
  lead = baseLead;
});

async function asEmployee() {
  await AsyncStorage.setItem(
    'user',
    JSON.stringify({uid: 'u-e1', _id: 'e1', fname: 'Meena', lname: 'S.', role: 'employee'}),
  );
}

const Stack = createNativeStackNavigator();
function Probe({route}: {route: {name: string; params?: object}}) {
  return <Text>{`at ${route.name} ${JSON.stringify(route.params ?? {})}`}</Text>;
}
function renderScreen(Component: React.ComponentType<any>, params?: object) {
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
                  {['Customer', 'CustomerForm', 'CreateLoan', 'Lead', 'NewLead', 'EmployeeForm'].map(name => (
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

describe('A4 customer form', () => {
  it('shows errors under the fields, then registers and opens the new customer', async () => {
    renderScreen(CustomerFormScreen);
    await waitFor(() => expect(screen.getByText('Save')).toBeTruthy());
    fireEvent.press(screen.getByText('Save'));
    expect(screen.getAllByText('This field is required').length).toBe(3);
    expect(screen.getByText('Enter a 10-digit mobile number')).toBeTruthy();
    expect(postSpy).not.toHaveBeenCalledWith('/admin/customer', expect.anything());

    fireEvent.changeText(screen.getByLabelText('First name'), 'Sunil');
    fireEvent.changeText(screen.getByLabelText('Last name'), 'Pawar');
    fireEvent.press(screen.getByText('Male'));
    fireEvent.changeText(screen.getByLabelText('Phone'), '97300 00001');
    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });
    expect(postSpy).toHaveBeenCalledWith(
      '/admin/customer',
      expect.objectContaining({
        fname: 'Sunil',
        lname: 'Pawar',
        gender: 'Male',
        phoneNumber: '9730000001',
        country: 'India',
      }),
    );
    await waitFor(() => expect(screen.getByText(/at Customer .*"id":"c9"/)).toBeTruthy());
  });
});

describe('A13 · E8 lead list', () => {
  it('puts the counts in the chips and total · converted under the title', async () => {
    renderScreen(LeadListScreen);
    await waitFor(() => expect(screen.getByText('Pooja Jain')).toBeTruthy());
    expect(screen.getByText('46 total · 7 converted')).toBeTruthy();
    expect(screen.getByText('Requested 2')).toBeTruthy();
    expect(screen.getByText('Pending 12')).toBeTruthy();
    expect(screen.getAllByText('Follow up today').length).toBe(2);
    expect(screen.getByText('Meena S. · Gold Loan')).toBeTruthy();
    expect(screen.getByText('Unassigned · Gold Loan')).toBeTruthy();
  });

  it('gives employees no Requested chip and a New lead button', async () => {
    await asEmployee();
    renderScreen(LeadListScreen);
    await waitFor(() => expect(screen.getByText('Pooja Jain')).toBeTruthy());
    expect(screen.queryByText('Requested 2')).toBeNull();
    expect(screen.getByText('New lead')).toBeTruthy();
  });
});

describe('A14 · E9 lead detail', () => {
  it('admin: approve needs remarks, then opens the customer form with the lead', async () => {
    renderScreen(LeadDetailScreen, {id: 'l1'});
    await waitFor(() => expect(screen.getByText('Docs collected, shop verified')).toBeTruthy());
    expect(screen.getByText('Step 2 of 5 · Follow-up')).toBeTruthy();
    fireEvent.press(screen.getByText('Approve and convert'));
    await waitFor(() => expect(screen.getByText('Approve Pooja Jain?')).toBeTruthy());
    // The sheet's button comes before the floating one in the tree.
    const buttons = screen.getAllByText('Approve and convert');
    expect(buttons.length).toBe(2);
    fireEvent.press(buttons[0]);
    expect(patchSpy).not.toHaveBeenCalled();
    const remarks = screen.getAllByLabelText(/Remarks/);
    fireEvent.changeText(remarks[remarks.length - 1], 'Verified');
    await act(async () => {
      fireEvent.press(buttons[0]);
    });
    expect(patchSpy).toHaveBeenCalledWith('/admin/lead/l1/status', {status: 'Approved', remarksByAdmin: 'Verified'});
    await waitFor(() => expect(screen.getByText(/at CustomerForm .*"_id":"l1"/)).toBeTruthy());
  });

  it('employee: Log follow-up while the follow-up is pending', async () => {
    await asEmployee();
    renderScreen(LeadDetailScreen, {id: 'l1'});
    await waitFor(() => expect(screen.getAllByText('Log follow-up').length).toBeGreaterThan(0));
    expect(screen.queryByText('Approve and convert')).toBeNull();
  });

  it('employee: a completed follow-up offers Request conversion', async () => {
    await asEmployee();
    lead = {...baseLead, followupStatus: 'Completed'};
    renderScreen(LeadDetailScreen, {id: 'l1'});
    await waitFor(() => expect(screen.getAllByText('Request conversion').length).toBeGreaterThan(0));
    expect(screen.getByLabelText('Request conversion')).toBeTruthy();
  });
});

describe('A16 employee profile', () => {
  it('shows the numbers and removes with an Undo that restores', async () => {
    renderScreen(EmployeeProfileScreen, {uid: 'u-e1'});
    await waitFor(() => expect(screen.getAllByText('Meena Shah').length).toBeGreaterThan(0));
    expect(screen.getByText('230')).toBeTruthy();
    expect(screen.getByText('Never')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('More'));
    fireEvent.press(await screen.findByText('Remove employee'));
    await waitFor(() => expect(screen.getByText('Remove Meena Shah?')).toBeTruthy());
    const buttons = screen.getAllByText('Remove employee');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });
    expect(deleteSpy).toHaveBeenCalledWith('/admin/employee', {uid: 'u-e1'});
    await waitFor(() => expect(screen.getByText('Undo')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Undo'));
    });
    expect(postSpy).toHaveBeenCalledWith('/admin/employee/restore', {uid: 'u-e1'});
  });
});

describe('A19 search', () => {
  it('lists recent customers before typing (P-18), then results with loans', async () => {
    await AsyncStorage.setItem(
      StorageKeys.recentCustomers,
      JSON.stringify([{_id: 'c2', uid: 'u2', name: 'Ramesh Kumar', phoneNumber: '9000000003'}]),
    );
    renderScreen(SearchScreen);
    await waitFor(() => expect(screen.getByText('Ramesh Kumar')).toBeTruthy());
    expect(screen.getByText('Recent customers')).toBeTruthy();
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('Name, phone, email or loan #'), 'sun');
      await new Promise(r => setTimeout(r, 350));
    });
    await waitFor(() => expect(screen.getByText('Sunita Devi')).toBeTruthy());
    expect(screen.getByText('#1039 ₹25k Active')).toBeTruthy();
    fireEvent.press(screen.getByText('Sunita Devi'));
    await waitFor(() => expect(screen.getByText(/at Customer .*"id":"c1"/)).toBeTruthy());
  });
});

