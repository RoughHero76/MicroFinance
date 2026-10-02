// W1 shell: login, lock, tabs and More for both roles (network mocked).
import React from 'react';
import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';

jest.mock('axios', () => {
  const reject = () => Promise.reject(Object.assign(new Error('offline'), {isAxiosError: true, code: 'ERR_NETWORK'}));
  const instance: any = jest.fn(reject);
  instance.request = jest.fn(reject);
  instance.interceptors = {request: {use: jest.fn()}, response: {use: jest.fn()}};
  instance.create = jest.fn(() => instance);
  instance.default = instance;
  return instance;
});

async function signedInAs(role: 'admin' | 'employee', lock = false) {
  await AsyncStorage.multiSet([
    ['user', JSON.stringify({_id: 'u1', fname: 'Meena', lname: 'Shah', role, email: 'meena@evi.in'})],
    ['token', 'test-token'],
    ['isLoggedIn', 'true'],
    ['userRole', role],
    ['onboarding.permissionsSeen', 'true'],
    ['settings.appLock', JSON.stringify({enabled: lock, afterMs: 60000})],
  ]);
}

async function renderApp() {
  jest.useFakeTimers();
  render(<App />);
  await act(async () => {
    jest.advanceTimersByTime(1500);
  });
  jest.useRealTimers();
}

describe('app shell', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('shows the login screen with the role switch when signed out', async () => {
    await AsyncStorage.setItem('onboarding.permissionsSeen', 'true');
    await renderApp();
    await waitFor(() => expect(screen.getByText('Welcome back')).toBeTruthy());
    expect(screen.getByText('Employee')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    fireEvent.press(screen.getByText('Sign in'));
    expect(screen.getAllByText('This field is required').length).toBe(2);
  });

  it('gives admins Home, Customers, Loans, Leads and More', async () => {
    await signedInAs('admin');
    await renderApp();
    await waitFor(() => expect(screen.getAllByText('More').length).toBeGreaterThan(0));
    for (const tab of ['Home', 'Customers', 'Loans', 'Leads']) {
      expect(screen.getAllByText(tab).length).toBeGreaterThan(0);
    }
  });

  it('gives employees Home, Collect, Customers, Leads and More', async () => {
    await signedInAs('employee');
    await renderApp();
    await waitFor(() => expect(screen.getAllByText('Collect').length).toBeGreaterThan(0));
    for (const tab of ['Home', 'Customers', 'Leads', 'More']) {
      expect(screen.getAllByText(tab).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText('Loans')).toBeNull();
  });

  it('shows admin-only items in More', async () => {
    await signedInAs('admin');
    await renderApp();
    await waitFor(() => expect(screen.getAllByText('More').length).toBeGreaterThan(0));
    fireEvent.press(screen.getAllByText('More')[0]);
    await waitFor(() => expect(screen.getByText('Employees')).toBeTruthy());
    expect(screen.getByText('Payments')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Log out')).toBeTruthy();
  });

  it('locks a saved session when app lock is on, and the phone prompt unlocks it', async () => {
    const Biometrics = require('react-native-biometrics') as jest.Mock;
    await signedInAs('employee', true);
    await renderApp();
    // The prompt (mocked to succeed) was shown, and the tabs opened after it.
    await waitFor(() => expect(screen.getAllByText('Collect').length).toBeGreaterThan(0));
    const instance = Biometrics.mock.results[Biometrics.mock.results.length - 1]?.value as {simplePrompt: jest.Mock};
    expect(instance.simplePrompt).toHaveBeenCalled();
  });
});
