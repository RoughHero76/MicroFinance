// Employees (A15, A16): list, profile, register, edit (with the account
// switch), password reset, remove and restore (Undo, BE-19d).

import {api} from '@/lib/api';
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
}

export interface EmployeeProfile extends EmployeeSummary {
  address?: string;
  emergencyContact?: string;
  role?: string;
  createdAt?: string;
  lastLogin?: string | null;
  lastSeen?: string | null;
  stats: {assignedLoans: number; activeLoans: number; repaymentsCollected: number};
}

export const staffKeys = {
  all: ['employees'] as const,
  list: () => ['employees', 'list'] as const,
  page: () => ['employees', 'page'] as const,
  profile: (uid: string) => ['employees', 'profile', uid] as const,
};

/** Every employee, for pickers (one cached list). */
export async function listEmployees(): Promise<EmployeeSummary[]> {
  const res = await api.get<{data: EmployeeSummary[]}>('/admin/employee', {limit: 500});
  return res.data ?? [];
}

export async function getEmployeesPage(page: number): Promise<Page<EmployeeSummary>> {
  const limit = 30;
  const res = await api.get<{data: EmployeeSummary[]; meta?: {totalPages: number}; total: number}>('/admin/employee', {
    page,
    limit,
  });
  return {items: res.data ?? [], page, totalPages: Math.ceil((res.total ?? 0) / limit) || 1, total: res.total};
}

export async function getEmployeeProfile(uid: string): Promise<EmployeeProfile> {
  const res = await api.get<{data: EmployeeProfile}>('/admin/employee/profile', {uid});
  return res.data;
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
export const removeEmployee = (uid: string) => api.delete('/admin/employee', {uid});
export const restoreEmployee = (uid: string) => api.post('/admin/employee/restore', {uid});
