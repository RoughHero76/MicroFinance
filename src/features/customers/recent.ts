// P-18: the last 5 customers opened and the last 5 searches, shown on Search
// before typing. Stored per person (cleared at logout, see storage.ts).

import {useCallback, useEffect, useState} from 'react';
import {readJson, StorageKeys, writeJson} from '@/lib/storage';

export interface RecentCustomer {
  _id: string;
  uid?: string;
  name: string;
  phoneNumber?: string;
  profilePic?: string | null;
}

const MAX = 5;

export async function rememberCustomer(customer: RecentCustomer): Promise<void> {
  const list = await readJson<RecentCustomer[]>(StorageKeys.recentCustomers, []);
  const next = [customer, ...list.filter(c => c._id !== customer._id)].slice(0, MAX);
  await writeJson(StorageKeys.recentCustomers, next);
}

export async function rememberSearch(query: string): Promise<void> {
  const q = query.trim();
  if (!q) return;
  const list = await readJson<string[]>(StorageKeys.recentSearches, []);
  const next = [q, ...list.filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX);
  await writeJson(StorageKeys.recentSearches, next);
}

export function useRecent() {
  const [customers, setCustomers] = useState<RecentCustomer[]>([]);
  const [searches, setSearches] = useState<string[]>([]);
  const reload = useCallback(async () => {
    setCustomers(await readJson<RecentCustomer[]>(StorageKeys.recentCustomers, []));
    setSearches(await readJson<string[]>(StorageKeys.recentSearches, []));
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  const clear = useCallback(async () => {
    await writeJson(StorageKeys.recentCustomers, []);
    await writeJson(StorageKeys.recentSearches, []);
    setCustomers([]);
    setSearches([]);
  }, []);
  return {customers, searches, reload, clear};
}
