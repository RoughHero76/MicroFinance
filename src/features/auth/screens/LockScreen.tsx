// S2b: quick unlock. The phone's own fingerprint or PIN/pattern prompt opens
// the app while the session is valid; "Use password instead" signs out.

import React, {useCallback, useEffect} from 'react';
import {StatusBar, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {makeStyles, statusBarStyle, useTheme} from '@/theme';
import {Avatar, BrandLogo, Button, Icon, Text} from '@/ui';
import {promptUnlock} from '../lock';
import {useSession} from '../SessionProvider';

export default function LockScreen() {
  const t = useTheme();
  const s = useStyles();
  const {t: tr} = useTranslation();
  const {user, unlock, signOut} = useSession();
  const name = [user?.fname, user?.lname].filter(Boolean).join(' ');

  const tryUnlock = useCallback(async () => {
    if (await promptUnlock(tr('auth.unlockPrompt', {brand: brand.name}))) unlock();
  }, [unlock, tr]);

  // Ask straight away; the button retries after a cancel.
  useEffect(() => {
    tryUnlock();
  }, [tryUnlock]);

  return (
    <View style={s.screen}>
      <StatusBar barStyle={statusBarStyle(t)} backgroundColor={t.colors.bg} />
      <View style={s.center}>
        <BrandLogo width={140} height={56} style={s.logo} />
        <Avatar name={name} uri={user?.profilePic} size={72} />
        <Text variant="h2" style={s.hi}>
          {tr('auth.hi', {name: user?.fname ?? ''})}
        </Text>
        <Text color="muted" align="center">
          {tr('auth.locked', {brand: brand.name})}
        </Text>
        <View style={s.hintRow}>
          <Icon name="fingerprint" size={22} color="primary" />
          <Text variant="small" color="muted" style={s.hint}>
            {tr('auth.lockHint')}
          </Text>
        </View>
        <Button title={tr('auth.unlock')} icon="lock-open-outline" onPress={tryUnlock} style={s.unlock} />
        <Button title={tr('auth.usePassword')} variant="text" onPress={() => signOut()} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(t => ({
  screen: {flex: 1, backgroundColor: t.colors.bg},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.space.xl, gap: t.space.sm},
  logo: {marginBottom: t.space.xl},
  hi: {marginTop: t.space.md},
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    marginTop: t.space.lg,
    paddingHorizontal: t.space.lg,
  },
  hint: {flexShrink: 1},
  unlock: {alignSelf: 'center', marginTop: t.space.lg},
}));
