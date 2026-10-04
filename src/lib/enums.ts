// One source for every enum and status (F-5), mirroring the Mongoose enums in
// MicroFinance-backend. Each status has a tone (its colour) and a t() label,
// so "Approved" looks the same on every screen (U-09).

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

export const LOAN_STATUSES = ['Pending', 'Approved', 'Active', 'Rejected', 'Closed'] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const SCHEDULE_STATUSES = [
  'Pending',
  'Paid',
  'PartiallyPaid',
  'PartiallyPaidFullyPaid',
  'Overdue',
  'AdvancePaid',
  'OverduePaid',
  'Waived',
] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const REPAYMENT_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
export type RepaymentStatus = (typeof REPAYMENT_STATUSES)[number];

export const LEAD_STATUSES = ['Pending', 'InProgress', 'Approved', 'Rejected'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number] | 'Converted';

export const FOLLOWUP_STATUSES = ['Pending', 'Completed'] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export const DOCUMENT_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'GooglePay', 'PhonePay', 'Paytm', 'Cheque', 'Other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const FREQUENCIES = ['Daily', 'Weekly', 'Monthly'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const LOAN_DURATIONS = Array.from({length: 22}, (_, i) => `${(i + 1) * 100} days`);

export const LOAN_TYPES = ['Personal', 'Home', 'Business', 'Education', 'Vehicle', 'Gold', 'Other'] as const;
export type LoanType = (typeof LOAN_TYPES)[number];

export const GENDERS = ['Male', 'Female', 'Other'] as const;
export type Gender = (typeof GENDERS)[number] | 'Not Defined';

export const DOCUMENT_TYPES = ['Id Proof', 'Bank', 'Goverment', 'Photo', 'Signature', 'Other'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Settled schedule statuses: nothing more is owed on the installment. */
export const SETTLED_SCHEDULE_STATUSES: ScheduleStatus[] = [
  'Paid',
  'AdvancePaid',
  'OverduePaid',
  'PartiallyPaidFullyPaid',
  'Waived',
];
export const OPEN_SCHEDULE_STATUSES: ScheduleStatus[] = ['Pending', 'PartiallyPaid', 'Overdue'];

export type StatusSet = 'loan' | 'schedule' | 'repayment' | 'lead' | 'followup' | 'document' | 'penalty' | 'account';

const TONES: Record<StatusSet, Record<string, Tone>> = {
  loan: {Pending: 'warning', Approved: 'info', Active: 'success', Rejected: 'danger', Closed: 'neutral'},
  schedule: {
    Pending: 'neutral',
    Paid: 'success',
    AdvancePaid: 'success',
    OverduePaid: 'success',
    PartiallyPaidFullyPaid: 'success',
    PartiallyPaid: 'warning',
    Overdue: 'danger',
    Waived: 'info',
  },
  repayment: {Pending: 'warning', Approved: 'success', Rejected: 'danger'},
  lead: {Pending: 'warning', InProgress: 'info', Approved: 'success', Rejected: 'danger', Converted: 'primary'},
  followup: {Pending: 'warning', Completed: 'success'},
  document: {Pending: 'warning', Approved: 'success', Rejected: 'danger'},
  penalty: {Pending: 'danger', Paid: 'success', Waived: 'info'},
  account: {active: 'success', inactive: 'neutral'},
};

export function statusTone(set: StatusSet, status: string | null | undefined): Tone {
  return (status && TONES[set][status]) || 'neutral';
}

/** i18n key for a status label; falls back to the raw value for unknowns. */
export function statusKey(set: StatusSet, status: string): string {
  return `status.${set}.${status}`;
}

export function normalizeLoanType(value: string | null | undefined): LoanType | null {
  if (!value) {
    return null;
  }
  const base = value
    .trim()
    .replace(/\s+loan$/i, '')
    .toLowerCase();
  return LOAN_TYPES.find(t => t.toLowerCase() === base) ?? null;
}

/** A lead's display status: converted leads read "Converted". */
export function leadDisplayStatus(lead: {status: string; isLeadConverted?: boolean}): LeadStatus {
  return lead.isLeadConverted ? 'Converted' : (lead.status as LeadStatus);
}
