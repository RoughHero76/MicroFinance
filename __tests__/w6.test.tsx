// W6 polish: long-press copies (P-07) and remembered filters (P-05).

import React from 'react';
import {beforeEach, expect, it} from '@jest/globals';
import {act, fireEvent, render, renderHook, screen, waitFor} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import i18n from '@/i18n';
import {useRemembered} from '@/lib/useRemembered';
import {ThemeProvider} from '@/theme';
import {KeyValueRows} from '@/ui';

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await AsyncStorage.clear();
});

it('long-press copies a transaction ID (P-07)', () => {
  render(
    <ThemeProvider initial={{palette: 'evi', mode: 'light'}}>
      <KeyValueRows rows={[{label: 'Transaction', value: 'UPI123456', copy: true}]} />
    </ThemeProvider>,
  );
  fireEvent(screen.getByText('UPI123456'), 'longPress');
  expect(Clipboard.setString).toHaveBeenCalledWith('UPI123456');
});

it('remembers a filter across visits (P-05)', async () => {
  const first = renderHook(() => useRemembered('loans.status', 'all'));
  await waitFor(() => expect(first.result.current[2]).toBe(true));
  act(() => first.result.current[1]('Pending'));
  first.unmount();
  await waitFor(async () => expect(await AsyncStorage.getItem('filters.loans.status')).toBe('"Pending"'));

  const again = renderHook(() => useRemembered('loans.status', 'all'));
  await waitFor(() => expect(again.result.current[2]).toBe(true));
  expect(again.result.current[0]).toBe('Pending');
});
