// F-01 / F-02: a tap that arrives while the app is locked waits for
// PushBridge, the app's start-up tap is handled once, and a link to a screen
// this role doesn't have opens the notification list instead.

import {describe, expect, jest, test} from '@jest/globals';
import * as messaging from '@react-native-firebase/messaging';
import {canOpen, notificationTarget, openNotification} from '@/features/notifications/text';
import {closeAllSheets} from '@/ui/Sheet';

const fire = (messaging as unknown as {__fire: (name: string, m: unknown) => void}).__fire;

const n = (screen?: string, id?: string) => ({
  _id: 'n1',
  type: 'x',
  params: {},
  link: {screen, id},
  readAt: null,
  createdAt: '',
});

const employeeState = {
  routeNames: ['Tabs', 'Loan', 'MyPayments', 'Notifications', 'Logins'],
  routes: [{name: 'Tabs', state: {routeNames: ['Home', 'Collect', 'Customers', 'More']}}],
};

describe('notification links', () => {
  test('a screen the role has opens, others fall back to the list', () => {
    const navigate = jest.fn();
    openNotification({navigate}, employeeState, n('MyPayments'));
    openNotification({navigate}, employeeState, n('Payments')); // admins only
    openNotification({navigate}, employeeState, n('Leads')); // tab switched off
    openNotification({navigate}, employeeState, n('Loan', 'L1'));
    expect(navigate.mock.calls).toEqual([
      ['MyPayments', undefined],
      ['Notifications'],
      ['Notifications'],
      ['Loan', {loanId: 'L1'}],
    ]);
  });

  test('from the list itself there is no fallback', () => {
    const navigate = jest.fn();
    openNotification({navigate}, employeeState, n('Risk'), false);
    expect(navigate).not.toHaveBeenCalled();
  });

  test('employee links carry their uid; tabs are checked too', () => {
    expect(notificationTarget(n('Employee', 'E7'))).toEqual(['Employee', {uid: 'E7'}]);
    expect(canOpen(employeeState, ['Tabs', {screen: 'Collect'}])).toBe(true);
    expect(canOpen(employeeState, ['Tabs', {screen: 'Leads'}])).toBe(false);
  });
});

describe('push taps', () => {
  test('a tap while locked waits for the bridge; the start-up tap is handled once', async () => {
    const push = require('@/lib/push');
    (messaging.getInitialNotification as unknown as jest.Mock<() => Promise<unknown>>).mockResolvedValueOnce({data: {screen: 'Collect'}});
    push.listenForTaps();
    // Locked: nobody listens yet.
    fire('opened', {data: {screen: 'Loan', id: 'L1'}});
    const seen: unknown[] = [];
    const off = push.onPushOpened((m: unknown) => seen.push(m));
    await Promise.resolve();
    await Promise.resolve();
    expect(seen).toEqual([{data: {screen: 'Loan', id: 'L1'}}, {data: {screen: 'Collect'}}]);
    off();
    // Mounted again (language change): the start-up tap is not repeated.
    const again: unknown[] = [];
    push.onPushOpened((m: unknown) => again.push(m));
    await Promise.resolve();
    expect(again).toEqual([]);
  });
});

describe('closeAllSheets', () => {
  test('resolves at once when nothing is open', async () => {
    await expect(closeAllSheets()).resolves.toBeUndefined();
  });
});
