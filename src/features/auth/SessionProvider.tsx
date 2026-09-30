// The session: who is signed in, whether the app is locked, and the server's
// module switches. Old screens read it through HomeContext (an adapter), so
// old and new code share one session.

import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {AppState} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {onSessionEnded, type SessionEndReason} from '@/lib/api';
import {can, type Modules, type Permission} from '@/lib/can';
import {clearQueryCache} from '@/lib/query';
import {clearSession, loadSession, saveSession, updateSessionUser, type Role, type SessionUser} from '@/lib/session';
import {clearPerUserStorage} from '@/lib/storage';
import {getBusinessSettings, type BusinessSettings} from './api';
import {canUseDeviceLock, getLockSettings, saveLockSettings, type LockSettings} from './lock';

export type SessionStatus = 'loading' | 'signedOut' | 'locked' | 'signedIn';
export type LogoutReason = SessionEndReason | null;

interface SessionContextValue {
  status: SessionStatus;
  user: SessionUser | null;
  role: Role | null;
  logoutReason: LogoutReason;
  clearLogoutReason: () => void;
  signIn: (user: SessionUser, token: string) => Promise<void>;
  signOut: (reason?: LogoutReason) => Promise<void>;
  unlock: () => void;
  updateUser: (patch: Partial<SessionUser>) => void;
  lockSettings: LockSettings;
  setLockSettings: (settings: LockSettings) => void;
  deviceLockAvailable: boolean;
  settings: BusinessSettings | undefined;
  modules: Partial<Modules>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({children}: {children: React.ReactNode}) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [logoutReason, setLogoutReason] = useState<LogoutReason>(null);
  const [lockSettings, setLockState] = useState<LockSettings>({enabled: false, afterMs: 60000});
  const [deviceLockAvailable, setDeviceLockAvailable] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  // Restore the saved session; lock it when app lock is on (S2b).
  useEffect(() => {
    (async () => {
      const [saved, lock, available] = await Promise.all([loadSession(), getLockSettings(), canUseDeviceLock()]);
      setLockState(lock);
      setDeviceLockAvailable(available);
      if (!saved) {
        setStatus('signedOut');
        return;
      }
      setUser(saved.user);
      setStatus(lock.enabled && available ? 'locked' : 'signedIn');
    })();
  }, []);

  const signOut = useCallback(async (reason: LogoutReason = null) => {
    setLogoutReason(reason);
    setUser(null);
    setStatus('signedOut');
    // Clears everything that belongs to this person, so a shared phone never
    // shows the previous person's customers. Theme and language stay.
    await Promise.all([clearSession(), clearPerUserStorage(), clearQueryCache()]);
  }, []);

  // A 401 that means the session is over (expired, removed, deactivated).
  useEffect(() => {
    onSessionEnded(reason => {
      signOut(reason);
    });
    return () => onSessionEnded(null);
  }, [signOut]);

  // Lock again after the app has been in the background long enough.
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'background') {
        backgroundedAt.current = Date.now();
      } else if (next === 'active' && backgroundedAt.current != null) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (status === 'signedIn' && lockSettings.enabled && deviceLockAvailable && away >= lockSettings.afterMs) {
          setStatus('locked');
        }
      }
    });
    return () => sub.remove();
  }, [status, lockSettings, deviceLockAvailable]);

  const signIn = useCallback(async (nextUser: SessionUser, token: string) => {
    await saveSession(nextUser, token);
    setLogoutReason(null);
    setUser(nextUser);
    setStatus('signedIn');
  }, []);

  const unlock = useCallback(() => setStatus(current => (current === 'locked' ? 'signedIn' : current)), []);

  const updateUser = useCallback((patch: Partial<SessionUser>) => {
    setUser(current => {
      if (!current) return current;
      const next = {...current, ...patch};
      updateSessionUser(next);
      return next;
    });
  }, []);

  const setLockSettings = useCallback((next: LockSettings) => {
    setLockState(next);
    saveLockSettings(next);
  }, []);

  // Business settings and module switches, loaded at sign-in and refreshed
  // when the app comes back to the front (M-11).
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: getBusinessSettings,
    enabled: status === 'signedIn',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    meta: {persist: true},
  });

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      role: user?.role ?? null,
      logoutReason,
      clearLogoutReason: () => setLogoutReason(null),
      signIn,
      signOut,
      unlock,
      updateUser,
      lockSettings,
      setLockSettings,
      deviceLockAvailable,
      settings: settingsQuery.data,
      modules: settingsQuery.data?.modules ?? {},
    }),
    [
      status,
      user,
      logoutReason,
      signIn,
      signOut,
      unlock,
      updateUser,
      lockSettings,
      setLockSettings,
      deviceLockAvailable,
      settingsQuery.data,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

/** can() for the signed-in user, honouring the server's module switches. */
export function useCan() {
  const {user, modules} = useSession();
  return useCallback((permission: Permission) => can(user, permission, modules), [user, modules]);
}
