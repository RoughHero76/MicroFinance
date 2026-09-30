// Today's collections (E2), the employee dashboard (E1, BE-2), the overdue
// list (E7) and "My payments" (E12, BE-7).

import {api} from '@/lib/api';
import type {Page} from '@/lib/useInfiniteList';
import type {Installment, Repayment} from '@/features/loans/types';

export const collectKeys = {
  today: ['collect', 'today'] as const,
  dashboard: ['dashboard', 'employee'] as const,
  overdue: (bucket: string) => ['overdue', bucket] as const,
  mine: (range: string) => ['payments', 'mine', range] as const,
};

export interface CollectionItem extends Omit<Installment, 'loan' | 'penalty'> {
  done?: boolean;
  penalty?: {amount?: number} | null;
  loan: {
    _id: string;
    loanAmount: number;
    loanEndDate?: string;
    loanNumber: string;
    totalOverdueAmount?: number;
    customer: {_id: string; fname: string; lname: string; phoneNumber?: string; profilePic?: string | null};
  };
}

export async function getTodaysCollections(): Promise<CollectionItem[]> {
  const res = await api.get<{data: CollectionItem[]}>('/employee/loan/collection/today', {includeDone: 'true'});
  return res.data ?? [];
}

export interface EmployeeDashboard {
  today: {
    dueCount: number;
    scheduledCount: number;
    amountScheduled: number;
    amountDue: number;
    amountCollected: number;
    paymentsCount: number;
  };
  customersCount: number;
  loans: {total: number; active: number};
  leads: {
    total: number;
    pending: number;
    inProgress: number;
    approved: number;
    rejected: number;
    converted: number;
    followUpsDue: number;
  };
  overdue: {sma0: number; sma1: number; sma2: number; npa: number; totalOverdue: number; loans: number};
}

export async function getEmployeeDashboard(): Promise<EmployeeDashboard> {
  const res = await api.get<{data: EmployeeDashboard}>('/employee/dashboard');
  return res.data;
}

export type OverdueBucket = 'all' | 'sma0' | 'sma1' | 'sma2' | 'npa';

export interface OverdueLoan {
  _id: string;
  smaLevel: number | null;
  npa: boolean;
  totalOverdue: number;
  repaymentSchedules: Installment[];
  loan: {
    _id: string;
    loanNumber: string;
    loanAmount: number;
    totalPaid?: number;
    businessAddress?: string;
    installmentFrequency?: string;
    customer?: {
      _id: string;
      fname: string;
      lname: string;
      phoneNumber?: string;
      address?: string;
      city?: string;
      email?: string;
    };
  };
}

/** Loans with something overdue; employees only get their own (B-11). */
export async function getOverduePage(bucket: OverdueBucket, page: number): Promise<Page<OverdueLoan>> {
  const res = await api.get<{
    data: OverdueLoan[];
    pagination: {currentPage: number; totalPages: number; totalResults: number};
  }>('/shared/loan/status', {
    status: 'Active',
    minOverdue: 0.01,
    includeCustomer: 'true',
    includeRepaymentSchedule: 'true',
    page,
    limit: 20,
    sortBy: 'totalOverdue',
    sortOrder: 'desc',
    smaLevel: bucket === 'sma0' ? 0 : bucket === 'sma1' ? 1 : bucket === 'sma2' ? 2 : undefined,
    // A loan counts once, NPA first (as in the dashboard and risk counts).
    npa: bucket === 'npa' ? 'true' : bucket === 'all' ? undefined : 'false',
  });
  return {
    items: res.data ?? [],
    page: res.pagination?.currentPage ?? page,
    totalPages: res.pagination?.totalPages || 1,
    total: res.pagination?.totalResults,
  };
}

export interface MyPaymentsSummary {
  total: number;
  cash: number;
  other: number;
  count: number;
  pending: number;
}

export async function getMyPaymentsPage(
  page: number,
  range: {from?: string; to?: string; status?: string},
): Promise<Page<Repayment> & {summary: MyPaymentsSummary}> {
  const res = await api.get<{
    data: Repayment[];
    summary: MyPaymentsSummary;
    meta: {page: number; totalPages: number; total: number};
  }>('/employee/loan/repayment/history', {page, limit: 20, ...range});
  return {
    items: res.data ?? [],
    page: res.meta?.page ?? page,
    totalPages: res.meta?.totalPages || 1,
    total: res.meta?.total,
    summary: res.summary,
  };
}
