// Customers: one role-aware layer over the admin and employee endpoints,
// mapped to one shape so CustomerList (A2·E4) and CustomerProfile (A3·E5)
// are shared screens.

import {api} from '@/lib/api';
import type {Role} from '@/lib/session';
import type {Page} from '@/lib/useInfiniteList';
import type {CustomerRef, Loan} from '@/features/loans/types';

export const customerKeys = {
  all: ['customers'] as const,
  list: (role: Role | null, q: string) => ['customers', 'list', role, q] as const,
  profile: (id: string) => ['customers', 'profile', id] as const,
  recent: ['customers', 'recent'] as const,
};

export interface CustomerListItem extends CustomerRef {
  loans: Loan[];
}

export interface CustomerSummary {
  borrowed: number;
  outstanding: number;
  onTimeRate: number | null;
  since: string | null;
  loans: number;
}

export interface CustomerProfile extends CustomerRef {
  loans: Loan[];
  summary?: CustomerSummary;
  createdAt?: string;
}

export async function getCustomersPage(role: Role, q: string, page: number): Promise<Page<CustomerListItem>> {
  if (role === 'employee') {
    const res = await api.get<{data: CustomerListItem[]; total: number; meta?: {totalPages: number}}>(
      '/employee/loan/customers',
      {
        page,
        limit: 20,
        q: q || undefined,
      },
    );
    return {items: res.data ?? [], page, totalPages: res.meta?.totalPages || 1, total: res.total};
  }
  const res = await api.get<{data: CustomerListItem[]; meta?: {totalPages: number; total: number}; total?: number}>(
    '/admin/customer',
    {
      page,
      limit: 20,
      q: q || undefined,
      fullDetails: 'true',
    },
  );
  return {items: res.data ?? [], page, totalPages: res.meta?.totalPages || 1, total: res.meta?.total ?? res.total};
}

/** Admin looks customers up by uid, employees by _id; the layer takes either. */
export async function getCustomerProfile(role: Role, id: {_id?: string; uid?: string}): Promise<CustomerProfile> {
  if (role === 'employee') {
    const res = await api.get<{data: CustomerProfile}>('/employee/loan/customer/profile', {customerId: id._id});
    return res.data;
  }
  const res = await api.get<{data: CustomerProfile | CustomerProfile[]}>('/admin/customer/profile', {
    uid: id.uid,
    customerId: id._id,
  });
  return Array.isArray(res.data) ? res.data[0] : res.data;
}

// --- Admin actions (A3, A4)

export interface CustomerInput {
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
}

export async function registerCustomer(input: CustomerInput): Promise<{_id: string; uid: string}> {
  const res = await api.post<{data: {_id: string; uid: string}}>('/admin/customer', input);
  return res.data;
}

export function updateCustomer(uid: string, input: Partial<CustomerInput>) {
  return api.put(`/admin/customer?uid=${encodeURIComponent(uid)}`, input);
}

export function deleteCustomer(uid: string) {
  return api.delete('/admin/customer', {uid});
}

export function uploadCustomerPhoto(
  uid: string,
  image: import('@/lib/image').PickedImage,
  onProgress?: (p: number) => void,
) {
  const form = new FormData();
  form.append('profilePic', {uri: image.uri, type: image.type, name: image.name} as unknown as Blob);
  return api.upload(`/admin/customer/profile/profilePicture?uid=${encodeURIComponent(uid)}`, form, onProgress);
}
