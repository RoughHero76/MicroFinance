// The web's quick unlock (S2b): the person types the 6-digit PIN they chose
// instead of using a fingerprint. Five wrong tries delete the saved copy of
// the session, and the person signs in with the password again.

import React, {useState} from 'react';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {PIN_LENGTH} from '@/lib/sealedSession';
import {unsealSession} from '@/lib/session';
import {makeStyles} from '@/theme';
import {Avatar, BrandLogo, Button, Text, TextField} from '@/ui';
import {useSession} from '../SessionProvider';

export default function LockScreen() {
  const s = useStyles();
  const {t: tr} = useTranslation();
  const {user, unlock, signOut} = useSession();
  const name = [user?.fname, user?.lname].filter(Boolean).join(' ');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (value: string) => {
    if (busy || value.length !== PIN_LENGTH) return;
    setBusy(true);
    const result = await unsealSession(value);
    setBusy(false);
    if (result.ok) return unlock();
    setPin('');
    if ('wiped' in result) {
      await signOut('expired');
      return;
    }
    setError(tr('web.pinWrong', {count: result.triesLeft}));
  };

  return (
    <View style={s.screen}>
      <View style={s.center}>
        <BrandLogo width={140} height={56} style={s.logo} />
        <Avatar name={name} uri={user?.profilePic} size={72} />
        <Text variant="h2" style={s.hi}>
          {tr('auth.hi', {name: user?.fname ?? ''})}
        </Text>
        <Text color="muted" align="center">
          {tr('auth.locked', {brand: brand.name})}
        </Text>
        <View style={s.field}>
          <TextField
            label={tr('web.pinPrompt')}
            value={pin}
            error={error}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
            autoFocus
            onChangeText={value => {
              const digits = value.replace(/\D/g, '').slice(0, PIN_LENGTH);
              setPin(digits);
              setError(null);
              if (digits.length === PIN_LENGTH) submit(digits);
            }}
          />
        </View>
        <Button
          title={tr('auth.unlock')}
          icon="lock-open-outline"
          loading={busy}
          onPress={() => submit(pin)}
          style={s.action}
        />
        <Button title={tr('auth.usePassword')} variant="text" onPress={() => signOut()} style={s.action} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(t => ({
  screen: {flex: 1, backgroundColor: t.colors.bg},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.space.xl, gap: t.space.sm},
  logo: {marginBottom: t.space.xl},
  hi: {marginTop: t.space.md},
  field: {width: '100%', maxWidth: 320, marginTop: t.space.lg},
  action: {alignSelf: 'center'},
}));
