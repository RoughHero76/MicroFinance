// S2: a visible Employee/Admin switch that remembers the last choice, the
// username (the API takes userName) and password, and why the last session
// ended. The response is never logged (B-8).

import React, {useEffect, useRef, useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, StatusBar, TextInput, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {errorMessage, isApiError} from '@/lib/api';
import type {Role} from '@/lib/session';
import {readJson, StorageKeys, writeJson} from '@/lib/storage';
import {makeStyles, statusBarStyle, useTheme, withAlpha} from '@/theme';
import {Appear, BrandLogo, Button, Icon, SegmentedControl, Text, TextField} from '@/ui';
import {login} from '../api';
import {useSession} from '../SessionProvider';

export default function LoginScreen() {
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const {t: tr} = useTranslation();
  const {signIn, logoutReason, clearLogoutReason} = useSession();
  const passwordRef = useRef<TextInput>(null);

  const [role, setRole] = useState<Role>('employee');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{userName?: string; password?: string; form?: string}>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    readJson<Role | null>(StorageKeys.loginRole, null).then(saved => {
      if (saved === 'admin' || saved === 'employee') setRole(saved);
    });
  }, []);

  const changeRole = (next: Role) => {
    setRole(next);
    setErrors({});
    writeJson(StorageKeys.loginRole, next);
  };

  const submit = async () => {
    const nextErrors: typeof errors = {};
    if (!userName.trim()) nextErrors.userName = tr('errors.required');
    if (!password) nextErrors.password = tr('errors.required');
    setErrors(nextErrors);
    if (nextErrors.userName || nextErrors.password) return;

    setBusy(true);
    try {
      const res = await login(role, userName, password);
      clearLogoutReason();
      await signIn({...res.user, role: res.user.role ?? role}, res.token);
    } catch (error) {
      const wrongPassword = isApiError(error) && error.code === 'INVALID_CREDENTIALS';
      setErrors(wrongPassword ? {password: errorMessage(error, tr)} : {form: errorMessage(error, tr)});
    } finally {
      setBusy(false);
    }
  };

  const reasonText =
    logoutReason === 'deactivated'
      ? tr('auth.loggedOutDeactivated')
      : logoutReason === 'expired'
      ? tr('auth.loggedOutExpired')
      : null;

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={statusBarStyle(t)} backgroundColor={t.colors.bg} />
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(t.colors.primary, t.dark ? 0.18 : 0.12), withAlpha(t.colors.primary, 0)]}
        style={s.glow}
      />
      <ScrollView
        contentContainerStyle={[s.content, {paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24}]}
        keyboardShouldPersistTaps="handled">
        <Appear>
          <BrandLogo width={180} height={72} style={s.logo} />
        </Appear>
        <Appear index={1}>
          <Text variant="h1" weight="bold">
            {tr('auth.welcome')}
          </Text>
          <Text color="muted" style={s.subtitle}>
            {tr('auth.signInTo', {brand: brand.name})}
          </Text>
        </Appear>

        {reasonText ? (
          <View style={s.reason} accessibilityRole="alert">
            <Icon name="information-outline" size={18} color="warning" />
            <Text variant="small" style={s.reasonText}>
              {reasonText}
            </Text>
          </View>
        ) : null}

        {/* Mock S2: the form sits on the page, no card around it. */}
        <Appear index={2}>
          <SegmentedControl<Role>
            options={[
              {value: 'employee', label: tr('auth.roleEmployee')},
              {value: 'admin', label: tr('auth.roleAdmin')},
            ]}
            value={role}
            onChange={changeRole}
            style={s.switch}
          />
          <TextField
            label={tr('auth.username')}
            placeholder={tr('auth.usernamePlaceholder')}
            icon="account-outline"
            value={userName}
            onChangeText={setUserName}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={errors.userName}
            textContentType="username"
          />
          <TextField
            ref={passwordRef}
            label={tr('auth.password')}
            icon="lock-outline"
            value={password}
            onChangeText={setPassword}
            secureToggle
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={submit}
            error={errors.password}
            textContentType="password"
          />
          {errors.form ? (
            <Text variant="small" color="danger" style={s.formError}>
              {errors.form}
            </Text>
          ) : null}
          <Button title={tr('auth.signIn')} onPress={submit} loading={busy} style={s.submit} />
        </Appear>

        <Text variant="small" color="muted" align="center" style={s.forgot}>
          {tr('auth.forgot')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(t => ({
  screen: {flex: 1, backgroundColor: t.colors.bg},
  // A phone-width column, centred on a wide (browser) window.
  content: {
    paddingHorizontal: t.space.xl,
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    ...(Platform.OS === 'web' ? {justifyContent: 'center' as const} : null),
  },
  logo: {alignSelf: 'flex-start', marginBottom: t.space.xl},
  subtitle: {marginTop: t.space.xs, marginBottom: t.space.lg},
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    padding: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.warningSoft,
    marginBottom: t.space.md,
  },
  reasonText: {flex: 1},
  glow: {position: 'absolute', top: 0, left: 0, right: 0, height: 320},
  switch: {marginBottom: t.space.lg},
  formError: {marginBottom: t.space.sm},
  submit: {marginTop: t.space.sm, minHeight: 44, paddingHorizontal: t.space.xl},
  forgot: {marginTop: t.space.lg},
}));
