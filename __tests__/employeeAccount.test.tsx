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
import ProfileScreen from '@/features/settings/screens/ProfileScreen';
import SecurityScreen from '@/features/settings/screens/SecurityScreen';
import LoginsScreen, {byDay, dayTitle} from '@/features/staff/screens/LoginsScreen';
import EmployeeProfileScreen, {activeAgo} from '@/features/staff/screens/EmployeeProfileScreen';
import LoansScreen from '@/features/loans/screens/LoansScreen';
import EmployeesScreen from '@/features/staff/screens/EmployeesScreen';
import {deviceName} from '@/lib/api';
import i18n from '@/i18n';
import {api} from '@/lib/api';
import {ThemeProvider} from '@/theme';
import {ToastHost} from '@/ui';

type Replies = Record<string, unknown>;
let gets: Replies = {};
let putSpy: jest.SpiedFunction<typeof api.put>;
let getSpy: jest.SpiedFunction<typeof api.get>;
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
  getSpy = jest.spyOn(api, 'get').mockImplementation(async (url: string) => {
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

describe('E-08 employee edits their own contact details', () => {
  it('edits phone, email, address and emergency contact, but not the name', async () => {
    await signIn('employee');
    gets['/employee/profile'] = {
      data: {uid: 'u1', fname: 'Meena', lname: 'Shah', userName: 'meena.s', phoneNumber: '9000033333', accountStatus: true},
    };
    renderScreen(ProfileScreen);
    await waitFor(() => expect(screen.getAllByText('Edit my details').length).toBeGreaterThan(0));
    fireEvent.press(screen.getAllByText('Edit my details')[0]);
    expect(screen.queryByLabelText('First name')).toBeNull();
    fireEvent.changeText(screen.getByLabelText('Address'), 'Gangapur Rd');
    fireEvent.changeText(screen.getByLabelText('Emergency contact'), '9000044444');
    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });
    expect(putSpy).toHaveBeenCalledWith('/employee/profile', {
      email: '',
      phoneNumber: '9000033333',
      address: 'Gangapur Rd',
      emergencyContact: '9000044444',
    });
  });

  it('checks the phone number before sending', async () => {
    await signIn('employee');
    gets['/employee/profile'] = {data: {uid: 'u1', fname: 'Meena', lname: 'Shah', phoneNumber: '12345'}};
    renderScreen(ProfileScreen);
    await waitFor(() => expect(screen.getAllByText('Edit my details').length).toBeGreaterThan(0));
    fireEvent.press(screen.getAllByText('Edit my details')[0]);
    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });
    expect(screen.getByText('Enter a 10-digit mobile number')).toBeTruthy();
    expect(putSpy).not.toHaveBeenCalled();
  });
});

describe('E-13 login history', () => {
  const now = new Date(2026, 9, 2, 12, 0);
  const at = (d: number, h: number) => new Date(2026, 9, d, h, 30).toISOString();

  it('groups logins as Today, Yesterday, then dates', () => {
    const t = (k: string) => (k === 'common.today' ? 'Today' : 'Yesterday');
    const entries = [at(2, 8), at(1, 18), at(1, 8), at(28, 9)].map((date, i) => ({
      _id: String(i),
      date: i === 3 ? new Date(2026, 8, 28, 9).toISOString() : date,
      device: null,
      appVersion: null,
      ip: null,
      newDevice: false,
    }));
    const sections = byDay(entries, d => dayTitle(d, 'en', t, now));
    expect(sections.map(sec => [sec.title, sec.data.length])).toEqual([
      ['Today', 1],
      ['Yesterday', 2],
      ['28 Sep', 1],
    ]);
  });

  it('names the phone once ("Jest", not "Jest Jest")', () => {
    expect(deviceName()).toBe('Jest');
  });

  it("shows an employee's logins with a New phone badge", async () => {
    await signIn('admin');
    gets['/admin/employee/logins'] = {
      data: [
        {_id: 'l1', date: new Date().toISOString(), device: 'samsung SM-A145F', appVersion: '1.0.6', ip: '49.36.x.x', newDevice: true},
      ],
    };
    renderScreen(LoginsScreen, {uid: 'e1', name: 'Meena Shah'});
    await waitFor(() => expect(screen.getByText('New phone')).toBeTruthy());
    expect(screen.getByText('samsung SM-A145F · app 1.0.6 · 49.36.x.x')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('lets an employee open their own logins from Security', async () => {
    await signIn('employee');
    renderScreen(SecurityScreen);
    await waitFor(() => expect(screen.getByText('My recent logins')).toBeTruthy());
  });
});

const meena = {
  _id: 'e1',
  uid: 'u-meena',
  fname: 'Meena',
  lname: 'Shah',
  userName: 'meena.s',
  phoneNumber: '9000033333',
  accountStatus: true,
  createdAt: '2025-01-10T00:00:00Z',
  lastLogin: '2026-10-02T03:22:00Z',
  stats: {assignedLoans: 42, activeLoans: 31, repaymentsCollected: 412},
};

describe('E-04 + E-05 employee profile', () => {
  it('says how long ago an employee was active', () => {
    const t = (k: string, o?: Record<string, unknown>) => `${k}:${o?.count ?? ''}`;
    const now = Date.parse('2026-10-02T12:00:00Z');
    expect(activeAgo('2026-10-02T11:59:30Z', t, 'en', now)).toBe('staff.activeNow:');
    expect(activeAgo('2026-10-02T11:48:00Z', t, 'en', now)).toBe('staff.activeMinutes:12');
    expect(activeAgo('2026-10-02T09:00:00Z', t, 'en', now)).toBe('staff.activeHours:3');
    expect(activeAgo(null, t, 'en', now)).toBeNull();
  });

  it("shows today's collection, overdue and cash held, and links to their work", async () => {
    await signIn('admin');
    gets['/admin/employee/profile'] = {
      data: {
        ...meena,
        lastActiveAt: new Date(Date.now() - 12 * 60000).toISOString(),
        today: {collected: 21300, due: 17100, percent: 55, overdueLoans: 6, cashHeld: 14200},
      },
    };
    renderScreen(EmployeeProfileScreen, {uid: 'u-meena'});
    await waitFor(() => expect(screen.getByText('₹21,300')).toBeTruthy());
    expect(screen.getByText('55%')).toBeTruthy();
    expect(screen.getByText(/of ₹38,400 due/)).toBeTruthy();
    expect(screen.getByText('6 overdue')).toBeTruthy();
    expect(screen.getByText('₹14,200 cash held')).toBeTruthy();
    expect(screen.getByText('Active 12 min ago')).toBeTruthy();
    for (const label of ['Loans', 'Payments', 'Overdue', 'Recent logins']) expect(screen.getByText(label)).toBeTruthy();
  });

  it("lists only the employee's loans when opened from their profile", async () => {
    await signIn('admin');
    gets['/admin/loan'] = {data: [], pagination: {currentPage: 1, totalPages: 1, totalItems: 0}};
    renderScreen(LoansScreen, {employee: {id: 'e1', name: 'Meena Shah'}});
    await waitFor(() => expect(getSpy).toHaveBeenCalledWith('/admin/loan', expect.objectContaining({assignedTo: 'e1'})));
    expect(screen.getByText(/Meena Shah/)).toBeTruthy();
  });
});

describe('E-07 employees list', () => {
  it("shows today's collection per row, chip counts, and keeps the call button", async () => {
    await signIn('admin');
    gets['/admin/employee'] = {
      data: [
        {...meena, today: {collected: 21300, due: 17100, percent: 55}},
        {_id: 'e3', uid: 'u3', fname: 'Rahul', lname: 'Joshi', accountStatus: false, phoneNumber: '9000055555'},
      ],
      total: 2,
      counts: {all: 2, active: 1, inactive: 1},
    };
    renderScreen(EmployeesScreen);
    await waitFor(() => expect(screen.getByText('₹21,300')).toBeTruthy());
    expect(screen.getByText('55% of today')).toBeTruthy();
    expect(screen.getByText('All 2')).toBeTruthy();
    expect(screen.getByText('Inactive 1')).toBeTruthy();
    expect(screen.getAllByLabelText('Call').length).toBe(2);
    fireEvent.press(screen.getByText('Inactive 1'));
    await waitFor(() =>
      expect(getSpy).toHaveBeenCalledWith('/admin/employee', expect.objectContaining({accountStatus: 'false'})),
    );
  });
});

describe('E-01 move loans', () => {
  const profile = {
    ...meena,
    today: {collected: 0, due: 0, percent: null, overdueLoans: 0, cashHeld: 14200},
    work: {openLoans: 31, openLeads: 3},
  };
  const staff = {
    data: [
      {_id: 'e1', uid: 'u-meena', fname: 'Meena', lname: 'Shah'},
      {_id: 'e2', uid: 'u-arif', fname: 'Arif', lname: 'Khan'},
      {_id: 'e3', uid: 'u-rahul', fname: 'Rahul', lname: 'Joshi', accountStatus: false},
    ],
    total: 3,
  };

  it('moves all open loans and leads to the chosen employee', async () => {
    await signIn('admin');
    gets['/admin/employee/profile'] = {data: profile};
    gets['/admin/employee'] = staff;
    postSpy.mockImplementation(async () => ({message: 'Moved 31 loans to Arif Khan', data: {loans: 31, leads: 3}}) as never);
    renderScreen(EmployeeProfileScreen, {uid: 'u-meena'});
    await waitFor(() => expect(screen.getAllByText('Meena Shah').length).toBeGreaterThan(0));
    fireEvent.press(screen.getByLabelText('More'));
    fireEvent.press(await screen.findByText('Move loans to…'));
    expect(screen.getByText('31 open loans')).toBeTruthy();
    // Removed and inactive employees, and Meena herself, aren't offered.
    await waitFor(() => expect(screen.getByText('Arif Khan')).toBeTruthy());
    expect(screen.queryByText('Rahul Joshi')).toBeNull();
    fireEvent.press(screen.getByText('Arif Khan'));
    await act(async () => {
      fireEvent.press(screen.getByText('Move 31 loans'));
    });
    expect(postSpy).toHaveBeenCalledWith('/admin/employee/move-loans', {
      uid: 'u-meena',
      toUid: 'u-arif',
      loanIds: undefined,
      includeLeads: true,
    });
  });

  it('removing someone with open loans asks who takes them, and warns about cash', async () => {
    await signIn('admin');
    gets['/admin/employee/profile'] = {data: profile};
    gets['/admin/employee'] = staff;
    const deleteSpy = jest.spyOn(api, 'delete').mockImplementation(async () => ({status: 'success'}) as never);
    renderScreen(EmployeeProfileScreen, {uid: 'u-meena'});
    await waitFor(() => expect(screen.getAllByText('Meena Shah').length).toBeGreaterThan(0));
    fireEvent.press(screen.getByLabelText('More'));
    fireEvent.press(await screen.findByText('Remove employee'));
    await waitFor(() => expect(screen.getByText('They have 31 open loans. Someone has to collect them.')).toBeTruthy());
    expect(screen.getByText('₹14,200 cash not handed over yet')).toBeTruthy();
    expect(screen.getByText('Their 3 open leads move too.')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText('Move & remove'));
    });
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(screen.getAllByText('Choose who takes them').length).toBeGreaterThan(0);
    fireEvent.press(screen.getByText('Arif Khan'));
    await act(async () => {
      fireEvent.press(screen.getByText('Move & remove'));
    });
    expect(deleteSpy).toHaveBeenCalledWith('/admin/employee', {uid: 'u-meena', moveTo: 'u-arif'});
    await waitFor(() => expect(screen.getByText('Undo')).toBeTruthy());
  });
});
