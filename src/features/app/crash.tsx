// S8: crash screen + report (BE-14). The report has the error, screen, app
// version, device and user id; never the token or form contents. Offline, it
// is kept and sent on the next launch.

import React from 'react';
import {Platform, View} from 'react-native';
import {getModel, getSystemVersion, getUniqueIdSync, getVersion} from 'react-native-device-info';
import {useTranslation} from 'react-i18next';
import {api} from '@/lib/api';
import {readJson, removeKey, StorageKeys, writeJson} from '@/lib/storage';
import {makeStyles} from '@/theme';
import {Button, Icon, Text} from '@/ui';

export interface CrashReport {
  message: string;
  stack?: string;
  screen?: string;
  appVersion: string;
  device: string;
  os: string;
  deviceId: string;
}

let currentScreen: string | undefined;

/** The navigator reports the current route, so reports say where it happened. */
export function setCurrentScreen(name: string | undefined) {
  currentScreen = name;
}

function deviceId() {
  try {
    return getUniqueIdSync();
  } catch {
    return 'unknown';
  }
}

export function buildReport(error: Error): CrashReport {
  return {
    message: String(error?.message || error).slice(0, 1000),
    stack: error?.stack?.slice(0, 8000),
    screen: currentScreen,
    appVersion: getVersion(),
    device: getModel(),
    os: `${Platform.OS} ${getSystemVersion()}`,
    deviceId: deviceId(),
  };
}

/** Sends a report; if that fails it is kept and retried at next launch. */
export async function sendReport(report: CrashReport): Promise<boolean> {
  try {
    await api.post('/shared/client-errors', report);
    return true;
  } catch {
    const pending = await readJson<CrashReport[]>(StorageKeys.pendingCrash, []);
    await writeJson(StorageKeys.pendingCrash, [...pending, report].slice(-5));
    return false;
  }
}

export async function flushPendingReports() {
  const pending = await readJson<CrashReport[]>(StorageKeys.pendingCrash, []);
  if (!pending.length) return;
  await removeKey(StorageKeys.pendingCrash);
  for (const report of pending) await sendReport(report);
}

function CrashScreen({sent, onHome}: {sent: boolean | null; onHome: () => void}) {
  const s = useStyles();
  const {t} = useTranslation();
  return (
    <View style={s.screen}>
      <View style={s.icon}>
        <Icon name="alert-circle-outline" size={36} color="danger" />
      </View>
      <Text variant="h2" align="center">
        {t('app.crashTitle')}
      </Text>
      <Text color="muted" align="center">
        {t('app.crashMessage')}
      </Text>
      {sent !== null ? (
        <Text variant="small" color={sent ? 'success' : 'muted'} align="center">
          {sent ? t('app.crashSent') : t('app.crashQueued')}
        </Text>
      ) : null}
      <Button title={t('app.goHome')} icon="home-outline" onPress={onHome} style={s.button} />
    </View>
  );
}

interface State {
  error: Error | null;
  sent: boolean | null;
}

export class CrashBoundary extends React.Component<{children: React.ReactNode; onReset?: () => void}, State> {
  state: State = {error: null, sent: null};

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {error, sent: null};
  }

  componentDidCatch(error: Error) {
    sendReport(buildReport(error)).then(sent => this.setState({sent}));
  }

  reset = () => {
    this.setState({error: null, sent: null});
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) return <CrashScreen sent={this.state.sent} onHome={this.reset} />;
    return this.props.children;
  }
}

const useStyles = makeStyles(t => ({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: t.space.xl,
    gap: t.space.sm,
    backgroundColor: t.colors.bg,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.space.md,
  },
  button: {alignSelf: 'center', marginTop: t.space.lg},
}));
