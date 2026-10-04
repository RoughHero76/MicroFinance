// Installment money helpers and the grouping the employee loan screen
// already used: a run of consecutive installments with the same status
// collapses into one row ("Paid · 8 installments · 01 Jun – 20 Jul").

import {OPEN_SCHEDULE_STATUSES, SETTLED_SCHEDULE_STATUSES} from '@/lib/enums';
import type {Installment, Penalty, Repayment} from './types';

export function installmentTotal(item: Pick<Installment, 'amount' | 'originalAmount'>): number {
  return item.originalAmount || item.amount || 0;
}

/** schedule.amount is paid-so-far only while PartiallyPaid. */
export function amountPaidSoFar(item: Pick<Installment, 'amount' | 'originalAmount' | 'status'>): number {
  if (item.status === 'PartiallyPaid') return item.amount || 0;
  if (SETTLED_SCHEDULE_STATUSES.includes(item.status) && item.status !== 'Waived') return installmentTotal(item);
  return 0;
}

export function amountStillDue(item: Pick<Installment, 'amount' | 'originalAmount' | 'status'>): number {
  if (item.status === 'Waived' || !OPEN_SCHEDULE_STATUSES.includes(item.status)) return 0;
  return Math.max(0, Math.round((installmentTotal(item) - amountPaidSoFar(item)) * 100) / 100);
}

/** What one repayment gave this installment (a payment can span several). */
export function allocationFor(repayment: Repayment, installmentId: string): number {
  const match = repayment.scheduleAllocations?.find(
    a => (typeof a.schedule === 'string' ? a.schedule : a.schedule?._id) === installmentId,
  );
  return match ? match.amount : repayment.amount;
}

export function isSplitPayment(repayment: Repayment): boolean {
  return (repayment.scheduleAllocations?.length ?? 0) > 1;
}

export function penaltyAmount(item: Pick<Installment, 'penalty' | 'penaltyApplied'>): number | null {
  if (!item.penaltyApplied) return null;
  const p = item.penalty as Penalty | string | null | undefined;
  return p && typeof p === 'object' ? p.amount ?? null : null;
}

export function collectorName(repayment: Pick<Repayment, 'collectedBy'>, adminLabel: string): string {
  const c = repayment.collectedBy;
  if (!c) return adminLabel;
  if (typeof c === 'string') return '';
  return [c.fname, c.lname].filter(Boolean).join(' ');
}

export interface InstallmentRun {
  key: string;
  status: Installment['status'];
  items: Installment[];
  first: Installment;
  last: Installment;
}

/** Consecutive installments with the same status, in due-date order. */
export function groupRuns(items: Installment[]): InstallmentRun[] {
  const runs: InstallmentRun[] = [];
  for (const item of items) {
    const current = runs[runs.length - 1];
    if (current && current.status === item.status) {
      current.items.push(item);
      current.last = item;
    } else {
      runs.push({key: item._id, status: item.status, items: [item], first: item, last: item});
    }
  }
  return runs;
}
