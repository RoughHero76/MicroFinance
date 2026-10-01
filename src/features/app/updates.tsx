// In-app updates (S5, X6): a check on every start and when the app comes
// back after 6 hours, a forced check from About, and download + install of
// the brand's APK.
//
// Two kinds of update: optional (a sheet; "Later" asks again in 3 days)
// and mandatory (a full screen that can't be closed), when the server says
// this version is older than its minimum. A mandatory update is remembered
// on the phone, so going offline or restarting doesn't get past it.

import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {AppState} from 'react-native';
import {getVersion} from 'react-native-device-info';
import {brand} from '@/brand';
import {api} from '@/lib/api';
import {useSession} from '@/features/auth/SessionProvider';

const CHECK_INTERVAL = 6 * 60 * 60 * 1000;
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'lastUpdateCheck';
const SNOOZE_KEY = 'updateSnooze';
const REQUIRED_KEY = 'updateRequired';

/** -1, 0 or 1, comparing dotted versions ("1.0.10" > "1.0.9"). */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').split('.').map(Number);
  const pb = b.replace(/^v/i, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

export interface UpdateInfo {
  latestVersion: string;
  size?: number;
  notes?: string[];
  downloadUrl?: string;
  /** This version is below the server's minimum: the app can't be used until updated. */
  mandatory?: boolean;
}

interface CheckResponse {
  updateAvailable: boolean;
  latestVersion?: string;
  downloadUrl?: string;
  size?: number;
  notes?: string[];
  mandatory?: boolean;
  minVersion?: string | null;
}

type DownloadState =
  | {status: 'idle'}
  | {status: 'downloading'; progress: number}
  | {status: 'error'; message: 'download' | 'install'};

interface UpdateContextValue {
  currentVersion: string;
  update: UpdateInfo | null;
  checking: boolean;
  /** Result of the last check: false when up to date. */
  lastCheckFound: boolean | null;
  check: (force?: boolean) => Promise<void>;
  download: DownloadState;
  install: () => Promise<void>;
  dismissed: boolean;
  /** Optional updates only: hide the prompt for this version for 3 days. */
  dismiss: () => void;
  /** A mandatory update is waiting; the app shows the blocking screen. */
  required: boolean;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({children}: {children: React.ReactNode}) {
  const {status} = useSession();
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastCheckFound, setLastCheckFound] = useState<boolean | null>(null);
  const [download, setDownload] = useState<DownloadState>({status: 'idle'});
  const [dismissed, setDismissed] = useState(false);
  const [required, setRequired] = useState(false);
  const currentVersion = getVersion();

  // A mandatory update seen before still applies offline or after a restart.
  useEffect(() => {
    AsyncStorage.getItem(REQUIRED_KEY).then(raw => {
      const saved = raw ? (JSON.parse(raw) as UpdateInfo & {minVersion: string}) : null;
      if (saved && compareVersions(currentVersion, saved.minVersion) < 0) {
        setUpdate(u => u ?? saved);
        setRequired(true);
      } else if (saved) {
        AsyncStorage.removeItem(REQUIRED_KEY);
      }
    });
  }, [currentVersion]);

  const check = useCallback(
    async (force = false) => {
      try {
        const last = Number(await AsyncStorage.getItem(LAST_CHECK_KEY)) || 0;
        if (!force && Date.now() - last < CHECK_INTERVAL) return;
        setChecking(true);
        const res = await api.get<CheckResponse>('/shared/app/update/check', {currentVersion});
        if (res.updateAvailable && res.latestVersion) {
          const info: UpdateInfo = {
            latestVersion: res.latestVersion,
            size: res.size,
            notes: res.notes,
            downloadUrl: res.downloadUrl,
            mandatory: !!res.mandatory,
          };
          setUpdate(info);
          setRequired(!!res.mandatory);
          if (res.mandatory && res.minVersion) {
            await AsyncStorage.setItem(REQUIRED_KEY, JSON.stringify({...info, minVersion: res.minVersion}));
          } else {
            await AsyncStorage.removeItem(REQUIRED_KEY);
          }
          // "Later" on an optional update holds for 3 days, per version.
          const snooze = JSON.parse((await AsyncStorage.getItem(SNOOZE_KEY)) || 'null') as {
            version: string;
            until: number;
          } | null;
          setDismissed(!res.mandatory && !!snooze && snooze.version === res.latestVersion && snooze.until > Date.now());
        } else {
          setUpdate(null);
          setRequired(false);
          await AsyncStorage.removeItem(REQUIRED_KEY);
        }
        setLastCheckFound(!!res.updateAvailable);
        // A failed check isn't recorded, so the next attempt doesn't wait a day.
        await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
      } catch {
        // Offline or server down: try again next time.
      } finally {
        setChecking(false);
      }
    },
    [currentVersion],
  );

  // The check needs a token, so it runs once signed in: always on start
  // (a mandatory update must be caught), then on return after 6 hours.
  useEffect(() => {
    if (status !== 'signedIn') return;
    check(true);
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') check();
    });
    return () => sub.remove();
  }, [status, check]);

  const install = useCallback(async () => {
    if (download.status === 'downloading') return;
    const url = `${brand.apiUrl}${update?.downloadUrl ?? '/api/shared/app/update/download'}`;
    const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${brand.id}-update.apk`;
    setDownload({status: 'downloading', progress: 0});
    let filePath: string;
    try {
      const res = await ReactNativeBlobUtil.config({fileCache: true, path, overwrite: true})
        .fetch('GET', url)
        .progress((received, total) => {
          const r = Number(received);
          const t = Number(total);
          if (t > 0) setDownload({status: 'downloading', progress: r / t});
        });
      filePath = res.path();
    } catch {
      setDownload({status: 'error', message: 'download'});
      return;
    }
    try {
      await ReactNativeBlobUtil.android.actionViewIntent(filePath, 'application/vnd.android.package-archive');
      setDownload({status: 'idle'});
    } catch {
      setDownload({status: 'error', message: 'install'});
    }
  }, [download.status, update]);

  const value = useMemo(
    () => ({
      currentVersion,
      update,
      checking,
      lastCheckFound,
      check,
      download,
      install,
      dismissed,
      dismiss: () => {
        if (required) return;
        setDismissed(true);
        if (update) {
          AsyncStorage.setItem(
            SNOOZE_KEY,
            JSON.stringify({version: update.latestVersion, until: Date.now() + SNOOZE_MS}),
          );
        }
      },
      required,
    }),
    [currentVersion, update, checking, lastCheckFound, check, download, install, dismissed, required],
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useUpdates(): UpdateContextValue {
  const value = useContext(UpdateContext);
  if (!value) throw new Error('useUpdates must be used inside UpdateProvider');
  return value;
}
