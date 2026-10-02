// Permissions in one place (F-6, U-13). Screens ask can(user, 'loan.close')
// and never compare roles themselves. The rules mirror what the server
// allows, so nothing is shown that the server would reject.

import type {Role} from './session';

export type Permission =
  | 'loan.create'
  | 'loan.approve'
  | 'loan.close'
  | 'loan.delete'
  | 'loan.forceDelete'
  | 'loan.assign'
  | 'loan.documents.edit'
  | 'payment.record'
  | 'payment.approve'
  | 'penalty.apply'
  | 'penalty.remove'
  | 'schedule.edit'
  | 'customer.create'
  | 'customer.edit'
  | 'customer.delete'
  | 'customer.photo'
  | 'employee.manage'
  | 'profile.edit'
  | 'profile.editName'
  | 'lead.create'
  | 'lead.followup'
  | 'lead.requestConversion'
  | 'lead.manage'
  | 'lead.convert'
  | 'reports.view'
  | 'risk.runSettlement'
  | 'settings.business'
  | 'security.changePassword'
  | 'security.backup'
  | 'calculator.useForLoan'
  | 'diagnostics.view'
  | 'activity.view'
  | 'cash.handover'
  | 'cash.confirm';

const ADMIN_ONLY: Permission[] = [
  'loan.create',
  'loan.approve',
  'loan.close',
  'loan.delete',
  'loan.forceDelete',
  'loan.assign',
  'loan.documents.edit',
  'payment.approve',
  'penalty.remove',
  'schedule.edit',
  'customer.create',
  'customer.edit',
  'customer.delete',
  'customer.photo',
  'employee.manage',
  'lead.manage',
  'lead.convert',
  'reports.view',
  'risk.runSettlement',
  'settings.business',
  'profile.editName',
  'security.backup',
  'calculator.useForLoan',
  'diagnostics.view',
  'activity.view',
  'cash.confirm',
];

const EMPLOYEE_ONLY: Permission[] = ['lead.create', 'lead.followup', 'lead.requestConversion', 'cash.handover'];

// Both roles: recording payments (BE-10 lets admins too), applying a
// penalty on an installment, changing one's own password (E-02) and own
// details (E-08; the name only for admins).
const BOTH: Permission[] = ['payment.record', 'penalty.apply', 'security.changePassword', 'profile.edit'];

/** Server-side module switches (M-11); a disabled module hides its actions. */
export interface Modules {
  leads: boolean;
  cashHandover: boolean;
  performanceReport: boolean;
}

const MODULE_OF: Partial<Record<Permission, keyof Modules>> = {
  'lead.create': 'leads',
  'lead.followup': 'leads',
  'lead.requestConversion': 'leads',
  'lead.manage': 'leads',
  'lead.convert': 'leads',
  'cash.handover': 'cashHandover',
  'cash.confirm': 'cashHandover',
};

export function can(
  user: {role: Role} | null | undefined,
  permission: Permission,
  modules?: Partial<Modules>,
): boolean {
  if (!user) {
    return false;
  }
  const module = MODULE_OF[permission];
  if (module && modules && modules[module] === false) {
    return false;
  }
  if (BOTH.includes(permission)) {
    return true;
  }
  if (ADMIN_ONLY.includes(permission)) {
    return user.role === 'admin';
  }
  if (EMPLOYEE_ONLY.includes(permission)) {
    return user.role === 'employee';
  }
  return false;
}
