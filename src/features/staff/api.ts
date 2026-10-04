// Employees (A15, A16): list, profile, register, edit (with the account
// switch), password reset, remove and restore (Undo, BE-19d).

import {api} from '@/lib/api';
import type {LoginEntry} from '@/features/auth/api';
import type {Loan} from '@/features/loans/types';
import type {Page} from '@/lib/useInfiniteList';

export interface EmployeeSummary {
  _id: string;
  uid: string;
  fname: string;
  lname: string;
  userName?: string;
  email?: string;
  phoneNumber?: string;
  accountStatus?: boolean;
  profilePic?: string | null;
  /** E-07: today's collection, when the list asks for it. */
  today?: {collected: number; due: number; percent: number | null};
}

export type EmployeeStatusFilter = 'all' | 'active' | 'inactive';
export interface EmployeeCounts {
  all: number;
  active: number;
  inactive: number;
}

export interface EmployeeProfile extends EmployeeSummary {
  address?: string;
  emergencyContact?: string;
  role?: string;
  createdAt?: string;
  lastLogin?: string | null;
  lastSeen?: string | null;
  stats: {assignedLoans: number; activeLoans: number; repaymentsCollected: number};
  /** E-05: the last time their app called the server. */
  lastActiveAt?: string | null;
  /** E-04: today, as on the employee's own Home; cashHeld only with the module on. */
  today?: {
    collected: number;
    due: number;
    percent: number | null;
    overdueLoans: number;
    cashHeld: number | null;
  };
  /** E-01: what someone would have to take over. */
  work?: {openLoans: number; openLeads: number};
}

export const staffKeys = {
  all: ['employees'] as const,
  list: () => ['employees', 'list'] as const,
  page: (q = '', status: EmployeeStatusFilter = 'all') => ['employees', 'page', q, status] as const,
  profile: (uid: string) => ['employees', 'profile', uid] as const,
  logins: (uid: string) => ['employees', 'logins', uid] as const,
  openLoans: (id: string) => ['employees', 'openLoans', id] as const,
};

/** Every employee, for pickers (one cached list). */
export async function listEmployees(): Promise<EmployeeSummary[]> {
  const res = await api.get<{data: EmployeeSummary[]}>('/admin/employee', {limit: 500});
  return res.data ?? [];
}

/** A15 (E-07): one page of the list, with today's numbers and the chip counts. */
export async function getEmployeesPage(
  page: number,
  filter: {q?: string; status?: EmployeeStatusFilter} = {},
): Promise<Page<EmployeeSummary> & {counts?: EmployeeCounts}> {
  const limit = 30;
  const res = await api.get<{data: EmployeeSummary[]; total: number; counts?: EmployeeCounts}>('/admin/employee', {
    page,
    limit,
    q: filter.q || undefined,
    accountStatus: filter.status === 'active' ? 'true' : filter.status === 'inactive' ? 'false' : undefined,
    includeToday: 'true',
  });
  return {
    items: res.data ?? [],
    page,
    totalPages: Math.ceil((res.total ?? 0) / limit) || 1,
    total: res.total,
    counts: res.counts,
  };
}

export async function getEmployeeProfile(uid: string): Promise<EmployeeProfile> {
  const res = await api.get<{data: EmployeeProfile}>('/admin/employee/profile', {uid});
  return res.data;
}

/** E-13: an employee's logins for the last 90 days (admin). */
export async function getEmployeeLogins(uid: string): Promise<LoginEntry[]> {
  const res = await api.get<{data: LoginEntry[]}>('/admin/employee/logins', {uid});
  return res.data ?? [];
}

export interface EmployeeInput {
  fname: string;
  lname: string;
  email: string;
  userName: string;
  phoneNumber: string;
  address?: string;
  emergencyContact?: string;
  password?: string;
  accountStatus?: boolean;
}

export const registerEmployee = (input: EmployeeInput) => api.post('/admin/employee', {...input, role: 'employee'});
export const updateEmployee = (uid: string, input: Partial<EmployeeInput>) =>
  api.put(`/admin/employee?uid=${encodeURIComponent(uid)}`, input);
export const resetEmployeePassword = (uid: string, newPassword: string) =>
  api.put(`/admin/employee/password?uid=${encodeURIComponent(uid)}`, {newPassword});
/** Remove; with open loans the server needs `moveTo` (who takes them, E-01). */
export const removeEmployee = (uid: string, moveTo?: string) =>
  api.delete('/admin/employee', moveTo ? {uid, moveTo} : {uid});

/** E-01: the employee's open loans (Pending, Approved, Active) for "Choose…". */
export async function getOpenLoansOf(employeeId: string): Promise<Loan[]> {
  const res = await api.get<{data: Loan[]}>('/admin/loan', {
    assignedTo: employeeId,
    limit: 300,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    includeCustomerProfile: 'true',
  });
  return (res.data ?? []).filter(l => ['Pending', 'Approved', 'Active'].includes(l.status));
}

/** E-01: hand open loans (all, or chosen) and optionally open leads to someone else. */
export const moveEmployeeLoans = (uid: string, toUid: string, opts: {loanIds?: string[]; includeLeads?: boolean} = {}) =>
  api.post<{message: string; data: {loans: number; leads: number}}>('/admin/employee/move-loans', {
    uid,
    toUid,
    ...opts,
  });
export const restoreEmployee = (uid: string) => api.post('/admin/employee/restore', {uid});
