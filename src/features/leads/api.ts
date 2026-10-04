// Leads (A13·E8, A14·E9, E10, A14b): one role-aware layer over the admin
// and employee endpoints (same LeadCustomers model).

import {api} from '@/lib/api';
import {formFile, type PickedImage} from '@/lib/image';
import type {Role} from '@/lib/session';
import type {Page} from '@/lib/useInfiniteList';

export interface LeadRemark {
  _id?: string;
  by: 'employee' | 'admin';
  authorId?: string;
  authorName?: string;
  kind: 'note' | 'followup' | 'conversion' | 'status';
  text: string;
  at: string;
}

interface PersonRef {
  _id: string;
  fname?: string;
  lname?: string;
}

export interface Lead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  loanType: string;
  loanAmount: number;
  loanDuration: string;
  loanPurpose: string;
  status: 'Pending' | 'InProgress' | 'Approved' | 'Rejected';
  date?: string;
  createdAt?: string;
  addedBy?: PersonRef | string | null;
  AssignedTo?: PersonRef | string | null;
  followupDate?: string | null;
  followupStatus?: 'Pending' | 'Completed';
  remarksEmployee?: string;
  remarksByAdmin?: string;
  remarks?: LeadRemark[];
  isLeadConverted?: boolean;
  leadConvertedDate?: string;
  customerId?: {_id: string; uid: string; fname: string; lname: string} | string | null;
  loanId?: string | null;
  conversionRequested?: boolean;
  conversionRequestedAt?: string;
  pictureUrl?: string | null;
}

export interface LeadStats {
  total: number;
  pending: number;
  inProgress: number;
  approved: number;
  rejected: number;
  converted: number;
  conversionRequested?: number;
}

export type LeadFilter = 'all' | 'Pending' | 'InProgress' | 'Approved' | 'Rejected' | 'Converted' | 'requested';

export const leadKeys = {
  all: ['leads'] as const,
  list: (role: Role | null, filter: string, q: string, assignedTo: string) =>
    ['leads', 'list', role, filter, q, assignedTo] as const,
  detail: (id: string) => ['leads', 'detail', id] as const,
};

export async function getLeadsPage(
  role: Role,
  opts: {filter: LeadFilter; q: string; assignedTo?: string; followupStatus?: string},
  page: number,
): Promise<Page<Lead> & {stats?: LeadStats}> {
  const res = await api.get<{
    data: {leads: Lead[]; stats: LeadStats};
    pagination: {totalLeads: number; totalPages: number; currentPage: number};
  }>(role === 'admin' ? '/admin/lead' : '/employee/lead', {
    page,
    limit: 20,
    status: opts.filter === 'all' || opts.filter === 'requested' ? undefined : opts.filter,
    conversionRequested: opts.filter === 'requested' ? 'true' : undefined,
    search: opts.q || undefined,
    assignedTo: opts.assignedTo || undefined,
    followupStatus: opts.followupStatus || undefined,
    sortBy: 'createdAt',
    sortOrder: -1,
  });
  return {
    items: res.data?.leads ?? [],
    page: res.pagination?.currentPage ?? page,
    totalPages: res.pagination?.totalPages || 1,
    total: res.pagination?.totalLeads,
    stats: res.data?.stats,
  };
}

export async function getLeadStats(role: Role): Promise<LeadStats> {
  if (role === 'admin') {
    const res = await getLeadsPage('admin', {filter: 'all', q: ''}, 1);
    return res.stats!;
  }
  const res = await api.get<{data: {overall: LeadStats}}>('/employee/lead/statistics');
  return res.data.overall;
}

export async function getLead(role: Role, id: string): Promise<Lead> {
  const res = await api.get<{data: Lead}>(role === 'admin' ? `/admin/lead/${id}` : `/employee/lead/${id}`);
  return res.data;
}

export interface NewLeadInput {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  loanType: string;
  loanAmount: number;
  loanDuration: string;
  loanPurpose: string;
  followupDate?: string;
  picture: PickedImage;
}

export function createLead(input: NewLeadInput, onProgress?: (p: number) => void) {
  const form = new FormData();
  const {picture, ...fields} = input;
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== '') form.append(k, String(v));
  });
  form.append('picture', formFile(picture));
  return api.upload<{data: Lead}>('/employee/lead/create', form, onProgress);
}

export const updateFollowup = (
  id: string,
  body: {followupDate?: string; followupStatus?: string; remarksEmployee?: string},
) => api.patch(`/employee/lead/${id}/followup`, body);
export const requestConversion = (id: string, remarksEmployee: string) =>
  api.post(`/employee/lead/${id}/request-conversion`, {remarksEmployee});

export const setLeadStatus = (id: string, status: Lead['status'], remarksByAdmin?: string) =>
  api.patch(`/admin/lead/${id}/status`, {status, remarksByAdmin});
export const assignLead = (id: string, employeeId: string) => api.post(`/admin/lead/${id}/assign`, {employeeId});
export const deleteLead = (id: string) => api.delete(`/admin/lead/${id}`);
export const restoreLead = (id: string) => api.post(`/admin/lead/${id}/restore`);

export async function createCustomerFromLead(
  id: string,
  customer: {
    fname: string;
    lname: string;
    gender: string;
    phoneNumber: string;
    email?: string;
    userName?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  },
): Promise<{customerId: string; customerUid: string}> {
  const res = await api.post<{data: {customerId: string; customerUid: string}}>(
    `/admin/lead/${id}/create-customer`,
    customer,
  );
  return res.data;
}
