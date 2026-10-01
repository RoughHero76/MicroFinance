// Loans, installments, payments and penalties. One role-aware layer (round
// 14): shared screens call these and never pick admin or employee URLs.

import {api} from '@/lib/api';
import type {PaymentMethod, ScheduleStatus} from '@/lib/enums';
import type {Role} from '@/lib/session';
import type {Page} from '@/lib/useInfiniteList';
import type {
  CustomerRef,
  Installment,
  Loan,
  LoanDetail,
  LoanDocument,
  PayResult,
  Repayment,
  ScheduleSummary,
} from './types';

export const loanKeys = {
  all: ['loans'] as const,
  detail: (id: string) => ['loans', 'detail', id] as const,
  schedule: (id: string, status?: string) => ['loans', 'schedule', id, status ?? 'all'] as const,
  payments: (id: string) => ['loans', 'payments', id] as const,
};

export async function getLoanDetail(role: Role, loanId: string): Promise<LoanDetail> {
  if (role === 'employee') {
    const res = await api.get<{
      data: {
        loanDetails: Loan;
        customerProfile?: CustomerRef;
        documents?: LoanDocument[];
        scheduleSummary?: ScheduleSummary;
      };
    }>('/employee/loan/details', {
      loanId,
      includeCustomerProfile: 'true',
      includeTotalPenalty: 'true',
      includeDocuments: 'true',
      includeSummary: 'true',
    });
    return {
      loan: res.data.loanDetails,
      customer: res.data.customerProfile ?? null,
      documents: res.data.documents ?? [],
      summary: res.data.scheduleSummary ?? null,
    };
  }
  const res = await api.get<{data: LoanDetail}>(`/admin/loan/${loanId}/overview`);
  return res.data;
}

interface ScheduleResponse {
  data: {
    repaymentSchedule: Installment[];
    loanStatus: string;
    currentPage: number;
    totalPages: number;
    totalEntries: number;
  };
}

/** Installments in due-date order, 20 at a time (BE-1: same shape for both roles). */
export async function getSchedulePage(
  role: Role,
  loanId: string,
  page: number,
  opts: {status?: ScheduleStatus; limit?: number} = {},
): Promise<Page<Installment>> {
  const url = role === 'admin' ? '/admin/loan/repayment/schedule' : '/employee/loan/repayment/schedule';
  const res = await api.get<ScheduleResponse>(url, {loanId, page, limit: opts.limit ?? 20, statusFilter: opts.status});
  return {
    items: res.data.repaymentSchedule ?? [],
    page: res.data.currentPage,
    totalPages: res.data.totalPages || 1,
    total: res.data.totalEntries,
  };
}

export async function getPaymentsPage(role: Role, loanId: string, page: number): Promise<Page<Repayment>> {
  const url = role === 'admin' ? '/admin/loan/repayment/history' : '/employee/loan/repayment/history';
  const limit = 20;
  const res = await api.get<{data: Repayment[]}>(url, {loanId, page, limit});
  const items = res.data ?? [];
  // This endpoint has no total; a short page means it was the last one.
  return {items, page, totalPages: items.length === limit ? page + 1 : page};
}

export interface PayInput {
  loanId: string;
  installmentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  /** Admins only: record on behalf of this employee (else as the admin). */
  collectedBy?: string;
}

/** Both roles record through /pay (BE-10). Never retried automatically. */
export async function recordPayment(input: PayInput): Promise<PayResult> {
  const res = await api.post<{data: PayResult}>('/employee/loan/pay', {
    loanId: input.loanId,
    repaymentScheduleId: input.installmentId,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    transactionId: input.transactionId?.trim() || undefined,
    collectedBy: input.collectedBy || undefined,
  });
  return res.data;
}

export function applyPenalty(role: Role, loanId: string, installmentId: string, penaltyAmount: number) {
  const url = role === 'admin' ? '/admin/loan/apply/penalty' : '/employee/loan/apply/penalty';
  return api.post<{status: string}>(url, {loanId, repaymentScheduleId: installmentId, penaltyAmount});
}

export function removePenalty(loanId: string, installmentId: string) {
  return api.post<{status: string}>('/admin/loan/remove/penalty', {loanId, repaymentScheduleId: installmentId});
}

// --- M-5 loan statements (both roles)

export interface LoanStatement {
  _id: string;
  lang: 'en' | 'hi';
  createdAt: string;
  createdByName?: string;
  createdByRole?: 'admin' | 'employee';
  size?: number;
  /** Admins may delete any statement, employees the ones they made. */
  canDelete?: boolean;
}

export async function getStatements(loanId: string): Promise<LoanStatement[]> {
  const res = await api.get<{data: LoanStatement[]}>(`/shared/loan/${loanId}/statements`);
  return res.data ?? [];
}

export async function createStatement(loanId: string, lang: 'en' | 'hi'): Promise<LoanStatement> {
  const res = await api.post<{data: LoanStatement}>(`/shared/loan/${loanId}/statements`, {lang}, {timeout: 60000});
  return res.data;
}

export const statementPdfPath = (loanId: string, id: string) => `/shared/loan/${loanId}/statements/${id}/pdf`;

export const deleteStatement = (loanId: string, id: string) => api.delete(`/shared/loan/${loanId}/statements/${id}`);
