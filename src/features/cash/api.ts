// M-3 cash handover (optional module, off by default).

import {api} from '@/lib/api';
import type {Page} from '@/lib/useInfiniteList';

export interface CashHolding {
  amount: number;
  cashCount: number;
  otherAmount: number;
  pendingApproval: number;
  payments: {
    _id: string;
    amount: number;
    paymentDate: string;
    status: string;
    loanNumber?: string;
    customerName: string;
  }[];
}

export interface CashHandover {
  _id: string;
  employee?: {_id: string; fname?: string; lname?: string; profilePic?: string | null; uid?: string};
  amount: number;
  cashCount: number;
  otherAmount?: number;
  status: 'Submitted' | 'Received' | 'Short';
  receivedAmount?: number;
  shortBy?: number;
  note?: string;
  createdAt: string;
  confirmedAt?: string;
}

export const cashKeys = {
  all: ['cash'] as const,
  holding: ['cash', 'holding'] as const,
  list: (scope: string) => ['cash', 'list', scope] as const,
};

export async function getHolding(): Promise<CashHolding> {
  const res = await api.get<{data: CashHolding}>('/employee/cash/today');
  return res.data;
}

export const handOverCash = () => api.post('/employee/cash/handover');

export async function getHandoversPage(
  role: 'admin' | 'employee',
  status: string,
  page: number,
): Promise<Page<CashHandover>> {
  const res = await api.get<{data: CashHandover[]; meta?: {totalPages: number; total: number}}>(
    role === 'admin' ? '/admin/cash/handovers' : '/employee/cash/handovers',
    {page, status: status || undefined},
  );
  return {items: res.data ?? [], page, totalPages: res.meta?.totalPages || 1, total: res.meta?.total};
}

export const confirmHandover = (id: string, body: {receivedAmount?: number; note?: string}) =>
  api.post(`/admin/cash/handovers/${id}/confirm`, body);
