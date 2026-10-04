// Loan, installment, payment and penalty shapes as the server returns them
// (mirroring the Mongoose models). Admin and employee endpoints map to these.

import type {
  DocumentStatus,
  DocumentType,
  Frequency,
  LoanStatus,
  LoanType,
  PaymentMethod,
  RepaymentStatus,
  ScheduleStatus,
} from '@/lib/enums';

export interface PersonRef {
  _id: string;
  fname?: string;
  lname?: string;
  profilePic?: string | null;
}

export interface ScheduleAllocation {
  schedule: string | {_id: string};
  amount: number;
}

export interface Repayment {
  _id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionId?: string | null;
  status: RepaymentStatus;
  balanceAfterPayment?: number | null;
  scheduleAllocations?: ScheduleAllocation[];
  /** null → recorded by an admin. */
  collectedBy?: PersonRef | string | null;
  logicNote?: string;
  rejectionReason?: string;
  loan?: string | {_id: string; loanNumber?: string; customer?: PersonRef & {phoneNumber?: string}};
  createdAt?: string;
}

export interface Penalty {
  _id: string;
  amount: number;
  reason?: string;
  appliedDate?: string;
  status?: 'Pending' | 'Paid' | 'Waived';
  loanInstallmentNumber?: number;
}

export interface Installment {
  _id: string;
  loan?: string;
  dueDate: string;
  /** Overloaded: paid-so-far while PartiallyPaid, else the installment amount. */
  amount: number;
  originalAmount?: number;
  status: ScheduleStatus;
  penaltyApplied?: boolean;
  penalty?: Penalty | string | null;
  loanInstallmentNumber?: number;
  repayments?: Repayment[];
  logicNote?: string;
  LogicNote?: string;
  paymentDate?: string;
}

export interface LoanDocument {
  _id: string;
  documentName: string;
  documentUrl: string;
  documentType: DocumentType;
  status?: DocumentStatus;
  createdAt?: string;
}

export interface Loan {
  _id: string;
  uid?: string;
  loanNumber: string;
  loanType?: LoanType;
  loanAmount: number;
  principalAmount?: number;
  loanDuration?: string;
  installmentFrequency?: Frequency;
  interestRate?: number;
  gracePeriod?: number;
  loanStartDate?: string;
  loanEndDate?: string;
  numberOfInstallments?: number;
  repaymentAmountPerInstallment?: number;
  outstandingAmount: number;
  totalPaid?: number;
  totalPenaltyAmount?: number;
  totalPenalty?: Penalty[];
  advanceBalance?: number;
  status: LoanStatus;
  businessFirmName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  assignedTo?: PersonRef | string | null;
  customer?: string | CustomerRef;
  createdAt?: string;
  /** Added by the customer profile endpoints. */
  nextDue?: NextDue | null;
}

export interface CustomerRef {
  _id: string;
  uid?: string;
  fname: string;
  lname: string;
  phoneNumber?: string;
  email?: string;
  userName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  profilePic?: string | null;
  accountStatus?: boolean | string;
}

export interface NextDue {
  _id?: string;
  dueDate: string;
  amount: number;
  status: ScheduleStatus;
  installment?: number;
}

export interface ScheduleSummary {
  total: number;
  paid: number;
  overdue: number;
  partial: number;
  pending: number;
  waived: number;
  nextDue: NextDue | null;
}

export interface LoanDetail {
  loan: Loan;
  customer: CustomerRef | null;
  documents: LoanDocument[];
  summary: ScheduleSummary | null;
}

/** Reply from POST /pay (BE-24 adds the balance and installments). */
export interface PayResult {
  repaymentDetails: Repayment;
  balanceAfterPayment?: number | null;
  outstandingAmount?: number;
  installments?: number[];
  loanNumber?: string;
}
