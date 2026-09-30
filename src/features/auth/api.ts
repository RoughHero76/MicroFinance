// Sign-in, own profile, password and backup (X1, X3). One role-aware layer:
// screens call these without caring which role is signed in.

import {api} from '@/lib/api';
import type {Role, SessionUser} from '@/lib/session';
import {formFile, type PickedImage} from '@/lib/image';

export interface LoginResponse {
  status: string;
  user: SessionUser;
  token: string;
}

export function login(role: Role, userName: string, password: string) {
  const url = role === 'admin' ? '/admin/login' : '/employee/auth/login';
  return api.post<LoginResponse>(url, {userName: userName.trim(), password});
}

export interface Profile {
  _id: string;
  uid: string;
  fname: string;
  lname: string;
  email?: string;
  userName?: string;
  phoneNumber?: string;
  address?: string;
  emergencyContact?: string;
  role: Role;
  accountStatus?: boolean | string;
  profilePic?: string | null;
  lastLogin?: string;
  loginHistory?: {date?: string} | null;
  createdAt?: string;
}

export async function getProfile(role: Role): Promise<Profile> {
  const res = await api.get<{data: Profile}>(role === 'admin' ? '/admin/profile' : '/employee/profile');
  return res.data;
}

export function uploadProfilePhoto(image: PickedImage, onProgress?: (fraction: number) => void) {
  const form = new FormData();
  form.append('profilePic', formFile(image));
  return api.upload<{status: string}>('/shared/profile/add/profilePicture', form, onProgress);
}

/** Admins only (the endpoint is admin-only on the server). */
export function changeAdminPassword(currentPassword: string, newPassword: string) {
  return api.put<{status: string; message: string}>('/admin/password', {currentPassword, newPassword});
}

/** Admins only: the full database backup as a zip. */
export const BACKUP_PATH = '/admin/database/backup';

export interface BusinessSettings {
  defaultInterestRate: number;
  gracePeriod: number;
  loanNumberPrefix: string;
  penaltyRate: number;
  minPayment: number;
  smaThresholds: {sma0: number; sma1: number; sma2: number};
  modules: {leads: boolean; cashHandover: boolean; performanceReport: boolean};
  updatedAt?: string;
  updatedByName?: string;
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const res = await api.get<{data: BusinessSettings}>('/shared/settings');
  return res.data;
}

export async function updateBusinessSettings(patch: Partial<BusinessSettings>): Promise<BusinessSettings> {
  const res = await api.put<{data: BusinessSettings}>('/shared/settings', patch);
  return res.data;
}

/** Admins edit their own name, email and phone (PUT /admin/profile). */
export function updateAdminProfile(patch: {fname?: string; lname?: string; email?: string; phoneNumber?: string}) {
  return api.put<{status: string}>('/admin/profile', patch);
}

export const authKeys = {
  profile: (role: Role | null) => ['profile', role] as const,
};
