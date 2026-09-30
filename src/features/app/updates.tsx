// In-app updates (S5, X6): an automatic check every 24 hours once signed in,
// a forced check from About, and download + install of the brand's APK.

import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {getVersion} from 'react-native-device-info';
import {brand} from '@/brand';
import {api} from '@/lib/api';
import {useSession} from '@/features/auth/SessionProvider';

const CHECK_INTERVAL = 24 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'lastUpdateCheck';

export interface UpdateInfo {
  latestVersion: string;
  size?: number;
  notes?: string[];
  downloadUrl?: string;
}

interface CheckResponse {
  updateAvailable: boolean;
  latestVersion?: string;
  downloadUrl?: string;
  size?: number;
  notes?: string[];
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
  dismiss: () => void;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({children}: {children: React.ReactNode}) {
  const {status} = useSession();
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastCheckFound, setLastCheckFound] = useState<boolean | null>(null);
  const [download, setDownload] = useState<DownloadState>({status: 'idle'});
  const [dismissed, setDismissed] = useState(false);
  const currentVersion = getVersion();

  const check = useCallback(
    async (force = false) => {
      try {
        const last = Number(await AsyncStorage.getItem(LAST_CHECK_KEY)) || 0;
        if (!force && Date.now() - last < CHECK_INTERVAL) return;
        setChecking(true);
        const res = await api.get<CheckResponse>('/shared/app/update/check', {currentVersion});
        if (res.updateAvailable && res.latestVersion) {
          setUpdate({latestVersion: res.latestVersion, size: res.size, notes: res.notes, downloadUrl: res.downloadUrl});
          setDismissed(false);
        } else {
          setUpdate(null);
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

  // The check needs a token, so it runs once signed in.
  useEffect(() => {
    if (status === 'signedIn') check();
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
      dismiss: () => setDismissed(true),
    }),
    [currentVersion, update, checking, lastCheckFound, check, download, install, dismissed],
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useUpdates(): UpdateContextValue {
  const value = useContext(UpdateContext);
  if (!value) throw new Error('useUpdates must be used inside UpdateProvider');
  return value;
}
