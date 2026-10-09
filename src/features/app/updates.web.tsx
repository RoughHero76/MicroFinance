// In-app updates are about the phone's APK. On the web the newest version
// loads whenever the page is opened, so nothing is checked or installed.
// Same exports as updates.tsx.

import React, {createContext, useContext, useMemo} from 'react';

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
  mandatory?: boolean;
}

type DownloadState =
  | {status: 'idle'}
  | {status: 'downloading'; progress: number}
  | {status: 'error'; message: 'download' | 'install'};

interface UpdateContextValue {
  currentVersion: string;
  update: UpdateInfo | null;
  checking: boolean;
  lastCheckFound: boolean | null;
  check: (force?: boolean) => Promise<void>;
  download: DownloadState;
  install: () => Promise<void>;
  dismissed: boolean;
  dismiss: () => void;
  required: boolean;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({children}: {children: React.ReactNode}) {
  const value = useMemo<UpdateContextValue>(
    () => ({
      currentVersion: __APP_VERSION__,
      update: null,
      checking: false,
      lastCheckFound: false,
      check: async () => undefined,
      download: {status: 'idle'},
      install: async () => undefined,
      dismissed: true,
      dismiss: () => undefined,
      required: false,
    }),
    [],
  );
  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useUpdates(): UpdateContextValue {
  const value = useContext(UpdateContext);
  if (!value) throw new Error('useUpdates must be used inside UpdateProvider');
  return value;
}
