// Admin-only loan actions (W3): list, create, approve / reject / undo, close,
// delete, reassign, documents, installment edit, payment approvals and the
// activity log. Shared reads live in ./api.ts.

import {api} from '@/lib/api';
import type {DocumentType, Frequency, LoanStatus, LoanType, PaymentMethod, ScheduleStatus} from '@/lib/enums';
import {formFile, type PickedImage} from '@/lib/image';
import type {Page} from '@/lib/useInfiniteList';
import type {Loan, Repayment} from './types';

export const adminLoanKeys = {
  list: (status: string, q: string, sort: string) => ['loans', 'list', status, q, sort] as const,
  approvals: (status: string, filter: string) => ['payments', 'approvals', status, filter] as const,
  deletePreview: (id: string) => ['loans', 'deletePreview', id] as const,
  activity: (filter: string) => ['activity', filter] as const,
  dashboard: ['dashboard', 'admin'] as const,
};

export type LoanSort = 'createdAt' | 'updatedAt' | 'loanNumber';

export async function getLoansPage(
  status: LoanStatus | 'all',
  q: string,
  sort: LoanSort,
  page: number,
): Promise<Page<Loan>> {
  const res = await api.get<{data: Loan[]; pagination: {currentPage: number; totalPages: number; totalItems: number}}>(
    '/admin/loan',
    {
      page,
      limit: 20,
      status: status === 'all' ? undefined : status,
      q: q || undefined,
      sortBy: sort,
      sortOrder: sort === 'loanNumber' ? 'asc' : 'desc',
      includeCustomerProfile: 'true',
      includeAssignedTo: 'true',
    },
  );
  return {
    items: res.data ?? [],
    page: res.pagination?.currentPage ?? page,
    totalPages: res.pagination?.totalPages || 1,
    total: res.pagination?.totalItems,
  };
}

export interface AdminDashboard {
  loanCount: number;
  newLeads: number;
  pendingRepayments: number;
  pendingLoans: number;
  collectedToday: {amount: number; count: number};
  marketDetails: {totalMarketAmount: number; totalMarketAmountRepaid: number};
  customerCount: number;
  recentCustomers: {
    _id: string;
    uid: string;
    fname: string;
    lname: string;
    phoneNumber?: string;
    profilePic?: string | null;
    loans: {loanAmount: number; status: LoanStatus}[];
  }[];
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const res = await api.get<{data: AdminDashboard}>('/admin/dashboard');
  return res.data;
}

export const approveLoan = (loanId: string) => api.get('/admin/loan/approve', {loanId});
export const rejectLoan = (loanId: string) => api.get('/admin/loan/reject', {loanId});
export const unapproveLoan = (loanId: string) => api.post('/admin/loan/unapprove', {loanId});
export const assignLoan = (loanId: string, employeeId: string) => api.post('/admin/loan/assign', {loanId, employeeId});
export const deleteLoan = (loanId: string, force = false) =>
  api.delete('/admin/loan', {loanId, force: force ? 'true' : undefined});

export interface DeletePreview {
  loanNumber: string;
  status: LoanStatus;
  installments: number;
  payments: {count: number; amount: number};
  penalties: {count: number; amount: number};
  documents: number;
  collector: string | null;
  forceRequired: boolean;
}

export async function getDeletePreview(loanId: string): Promise<DeletePreview> {
  const res = await api.get<{data: DeletePreview}>(`/admin/loan/${loanId}/delete-preview`);
  return res.data;
}

export interface CloseInput {
  loanId: string;
  amount: number;
  forgiveLoan: boolean;
  forgivePenalties: boolean;
  deleteLoanDocuments: boolean;
}

export const closeLoan = (input: CloseInput) =>
  api.post('/admin/loan/close', {
    loanId: input.loanId,
    totalRemainingAmountCustomerIsPaying: input.amount,
    forgiveLoan: input.forgiveLoan,
    forgivePenalties: input.forgivePenalties,
    deleteLoanDocuments: input.deleteLoanDocuments,
  });

export interface NewDocument {
  image: PickedImage;
  name: string;
  type: DocumentType;
}

export function addDocuments(loanId: string, docs: NewDocument[], onProgress?: (p: number) => void) {
  const form = new FormData();
  docs.forEach((doc, i) => {
    form.append('documents', formFile(doc.image));
    form.append(`documentNames[${i}]`, doc.name);
    form.append(`documentTypes[${i}]`, doc.type);
  });
  return api.upload(`/admin/loan/${loanId}/add/documents`, form, onProgress);
}

export const deleteDocuments = (loanId: string, documentIds: string[]) =>
  api.delete(`/admin/loan/${loanId}/delete/documents`, undefined, {documentIds});

export interface CreateLoanInput {
  customerUid: string;
  loanNumber: string;
  loanType: LoanType;
  loanAmount: number;
  principalAmount: number;
  loanDuration: string;
  installmentFrequency: Frequency;
  interestRate: number;
  gracePeriod: number;
  loanStartDate: Date;
  businessFirmName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  documents: NewDocument[];
}

export function createLoan(input: CreateLoanInput, onProgress?: (p: number) => void) {
  const form = new FormData();
  const fields: Record<string, string> = {
    customerUid: input.customerUid,
    loanNumber: input.loanNumber,
    loanType: input.loanType,
    loanAmount: String(input.loanAmount),
    principalAmount: String(input.principalAmount),
    loanDuration: input.loanDuration,
    installmentFrequency: input.installmentFrequency,
    interestRate: String(input.interestRate),
    gracePeriod: String(input.gracePeriod),
    loanStartDate: input.loanStartDate.toISOString(),
    businessFirmName: input.businessFirmName,
    businessAddress: input.businessAddress,
    businessPhone: input.businessPhone,
    businessEmail: input.businessEmail,
  };
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  const meta = input.documents.map((doc, i) => ({
    fieldname: `document_${i}`,
    documentName: doc.name,
    documentType: doc.type,
  }));
  form.append('documents', JSON.stringify(meta));
  input.documents.forEach((doc, i) => form.append(`document_${i}`, formFile(doc.image)));
  return api.upload<{loan: Loan}>('/admin/loan', form, onProgress);
}

export interface Calculation {
  loanEndDate: string;
  numberOfInstallments: number;
  repaymentAmountPerInstallment: number;
  totalRepaymentAmount: number;
}

export async function calculateLoan(input: {
  loanAmount: number;
  loanStartDate: Date;
  loanDuration: string;
  installmentFrequency: Frequency;
  gracePeriod: number;
}): Promise<Calculation> {
  const res = await api.post<{data: Calculation}>('/shared/loan/calculate', {
    ...input,
    loanStartDate: input.loanStartDate.toISOString(),
  });
  return res.data;
}

/** A7c: every field from the edit form is sent (B-1). */
export interface InstallmentEdit {
  id: string;
  status: ScheduleStatus;
  amount?: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  penaltyAmount?: number;
  penaltyReason?: string;
  penaltyAppliedDate?: string;
  transactionId?: string;
  collectedBy?: string;
}

export const editInstallment = (edit: InstallmentEdit) => api.post('/admin/loan/repayment/schedule/update', edit);

// --- Payment approvals (A12)

export interface ApprovalItem extends Omit<Repayment, 'collectedBy' | 'loan'> {
  collectedBy: string;
  /** null → recorded by an admin. */
  collector?: {_id: string; name: string; profilePic?: string | null} | null;
  loan?: {
    _id: string;
    loanNumber?: string;
    loanAmount?: number;
    customer?: {_id: string; fname: string; lname: string};
  };
  loanDetails?: {loanAmount: number; borrower: string; outstandingAmount: number};
}

export async function getApprovalsPage(
  status: 'Pending' | 'Approved' | 'Rejected' | 'all',
  filter: {loanNumber?: string; date?: string},
  page: number,
): Promise<Page<ApprovalItem>> {
  const res = await api.get<{data: ApprovalItem[]; pagination?: {page: number; pages: number; total: number}}>(
    '/admin/loan/repayment/history/approve',
    {
      page,
      limit: 50,
      status: status === 'all' ? undefined : status,
      loanNumber: filter.loanNumber || undefined,
      defaultDate: filter.date ? 'false' : undefined,
      date: filter.date || undefined,
    },
  );
  return {
    items: res.data ?? [],
    page: res.pagination?.page ?? page,
    totalPages: res.pagination?.pages || 1,
    total: res.pagination?.total,
  };
}

export const approvePayment = (repaymentId: string) => api.post('/admin/loan/repayment/history/approve', {repaymentId});
export const unapprovePayment = (repaymentId: string) =>
  api.post('/admin/loan/repayment/history/unapprove', {repaymentId});
export const rejectPayment = (repaymentId: string, reason: string) =>
  api.post('/admin/loan/repayment/history/reject', {repaymentId, reason});
export const approvePayments = (repaymentIds: string[]) =>
  api.post<{data: {approved: string[]; skipped: number; amount: number}}>(
    '/admin/loan/repayment/history/approve-many',
    {
      repaymentIds,
    },
  );

// --- Activity (M-1)

export interface ActivityEntry {
  _id: string;
  action: string;
  actorName?: string;
  actorRole: 'admin' | 'employee' | 'system';
  summary?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  params?: Record<string, unknown>;
  createdAt: string;
  loan?: string;
}

export async function getActivityPage(
  filter: {loan?: string; action?: string},
  page: number,
): Promise<Page<ActivityEntry>> {
  const res = await api.get<{data: ActivityEntry[]; meta: {page: number; totalPages: number; total: number}}>(
    '/admin/loan/activity',
    {...filter, page, limit: 30},
  );
  return {
    items: res.data ?? [],
    page: res.meta?.page ?? page,
    totalPages: res.meta?.totalPages || 1,
    total: res.meta?.total,
  };
}
