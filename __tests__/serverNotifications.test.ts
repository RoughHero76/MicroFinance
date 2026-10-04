// Notification types the app doesn't know (added on the server later) show
// the server's text, in Hindi when available; an admin's message shows as
// written; links can open a customer or a tab.

import {afterEach, describe, expect, it} from '@jest/globals';
import type {AppNotification} from '@/features/notifications/api';
import {notificationTarget, notificationText} from '@/features/notifications/text';
import i18n from '@/i18n';

const n = (over: Partial<AppNotification>): AppNotification => ({
  _id: 'n1',
  type: 'collect.today',
  params: {},
  readAt: null,
  createdAt: new Date().toISOString(),
  ...over,
});

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('server-defined notifications', () => {
  const reminder = n({
    title: 'Today: 5 to collect · ₹6,390',
    body: 'Sunita Devi ₹1,065 · +4 more',
    i18n: {hi: {title: 'आज: 5 वसूली · ₹6,390', body: 'Sunita Devi ₹1,065 · +4 और'}},
    link: {screen: 'Collect'},
  });

  it('shows the server text in English', async () => {
    await i18n.changeLanguage('en');
    expect(notificationText(reminder, i18n.t)).toEqual({
      title: 'Today: 5 to collect · ₹6,390',
      body: 'Sunita Devi ₹1,065 · +4 more',
    });
  });

  it('shows the server’s Hindi when the app is in Hindi', async () => {
    await i18n.changeLanguage('hi');
    expect(notificationText(reminder, i18n.t).title).toBe('आज: 5 वसूली · ₹6,390');
  });

  it('falls back to English when the server sent no Hindi', async () => {
    await i18n.changeLanguage('hi');
    expect(notificationText(n({title: 'New thing', body: 'Details'}), i18n.t).title).toBe('New thing');
  });

  it('opens the tab or customer the server links to', () => {
    expect(notificationTarget(reminder)).toEqual(['Tabs', {screen: 'Collect'}]);
    expect(notificationTarget(n({link: {screen: 'Customer', id: 'C1'}}))).toEqual(['Customer', {id: 'C1'}]);
  });

  it('shows an admin message exactly as written', () => {
    const msg = n({type: 'custom.message', params: {title: 'Office closed tomorrow', message: 'Back Monday'}});
    expect(notificationText(msg, i18n.t)).toEqual({title: 'Office closed tomorrow', body: 'Back Monday'});
  });
});
