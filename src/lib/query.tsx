// Data layer (F-3): TanStack Query with the list cache saved on the phone, so
// lists still show (with their time) when the network drops (U-10, S7).

import React, {useEffect} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {focusManager, onlineManager, QueryClient, type Query} from '@tanstack/react-query';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister';
import {isApiError} from './api';
import {StorageKeys} from './storage';

const DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: DAY,
      // Retry once on network trouble, never on a 4xx answer.
      retry: (failureCount, error) => {
        if (isApiError(error) && error.kind === 'http' && (error.status ?? 500) < 500) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnReconnect: true,
    },
    mutations: {
      // Money must never be sent twice by an automatic retry (U-10).
      retry: false,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: StorageKeys.queryCache,
  throttleTime: 2000,
});

// Only lists and details marked `meta: { persist: true }` are saved, so the
// saved cache stays small and never holds one-off lookups.
function shouldPersist(query: Query) {
  return query.state.status === 'success' && query.meta?.persist === true;
}

onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => setOnline(state.isConnected !== false && state.isInternetReachable !== false)),
);

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

export function QueryProvider({children}: {children: React.ReactNode}) {
  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: DAY,
        buster: 'v1',
        dehydrateOptions: {shouldDehydrateQuery: shouldPersist},
      }}>
      {children}
    </PersistQueryClientProvider>
  );
}

/** Drops every cached list (logout: a shared phone must not show old data). */
export async function clearQueryCache() {
  queryClient.clear();
  await persister.removeClient();
}
