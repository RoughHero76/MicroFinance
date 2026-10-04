// A19 search: one endpoint for both roles (the server limits employees to
// customers on their assigned loans).

import {api} from '@/lib/api';

export interface SearchResult {
  _id: string;
  uid: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  userName?: string;
  profilePic?: string | null;
  loanCount: number;
  loans: {_id: string; loanNumber?: string; loanAmount: number; status: string}[];
}

export async function searchCustomers(query: string): Promise<SearchResult[]> {
  const res = await api.post<{data: {customers?: SearchResult[]} | SearchResult[]}>('/shared/search', {
    query,
    page: 1,
    limit: 30,
  });
  const data = res.data as {customers?: SearchResult[]} | SearchResult[];
  return Array.isArray(data) ? data : data.customers ?? [];
}
