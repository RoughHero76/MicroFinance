// Employees (A15, A16). W1 only needs the list for the assign pickers; the
// full API arrives with the staff screens in W4.

import {api} from '@/lib/api';

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

export const staffKeys = {
  all: ['employees'] as const,
  list: () => ['employees', 'list'] as const,
};

/** Every employee, for pickers (the old HomeContext loaded this at login). */
export async function listEmployees(): Promise<EmployeeSummary[]> {
  const res = await api.get<{data: EmployeeSummary[]}>('/admin/employee', {limit: 500});
  return res.data ?? [];
}
