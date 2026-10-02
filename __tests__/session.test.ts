// W6: the token lives only in the keychain. Sessions saved by older versions
// (token in AsyncStorage) are moved there on first load.

import {beforeEach, expect, it} from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {clearSession, getToken, loadSession, saveSession} from '@/lib/session';

beforeEach(async () => {
  await clearSession();
  await AsyncStorage.clear();
});

it('saves the token in the keychain, not AsyncStorage', async () => {
  await saveSession({role: 'employee', _id: 'e1', fname: 'Meena'}, 'tok-1');
  expect(await AsyncStorage.getItem('token')).toBeNull();
  expect(await Keychain.getGenericPassword({service: 'session.token'})).toMatchObject({password: 'tok-1'});
  expect((await loadSession())?.token).toBe('tok-1');
});

it("moves an older version's token into the keychain", async () => {
  await AsyncStorage.multiSet([
    ['user', JSON.stringify({role: 'admin', uid: 'a1'})],
    ['token', 'old-tok'],
    ['isLoggedIn', 'true'],
  ]);
  const session = await loadSession();
  expect(session?.token).toBe('old-tok');
  expect(await AsyncStorage.getItem('token')).toBeNull();
  expect(await Keychain.getGenericPassword({service: 'session.token'})).toMatchObject({password: 'old-tok'});
});

it('signing out removes it everywhere', async () => {
  await saveSession({role: 'admin', uid: 'a1'}, 'tok-2');
  await clearSession();
  expect(await getToken()).toBeNull();
  expect(await loadSession()).toBeNull();
});
