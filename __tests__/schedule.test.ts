import {describe, expect, it} from '@jest/globals';
import {
  allocationFor,
  amountPaidSoFar,
  amountStillDue,
  collectorName,
  groupRuns,
  penaltyAmount,
} from '@/features/loans/schedule';
import type {Installment, Repayment} from '@/features/loans/types';

const inst = (fields: Partial<Installment>): Installment => ({
  _id: Math.random().toString(36).slice(2),
  dueDate: '2026-09-01',
  amount: 100,
  originalAmount: 100,
  status: 'Pending',
  ...fields,
});

describe('installment money', () => {
  it('reads paid-so-far and still-due for every status', () => {
    expect(amountPaidSoFar(inst({status: 'PartiallyPaid', amount: 40}))).toBe(40);
    expect(amountStillDue(inst({status: 'PartiallyPaid', amount: 40}))).toBe(60);
    expect(amountStillDue(inst({status: 'Overdue'}))).toBe(100);
    expect(amountStillDue(inst({status: 'Paid'}))).toBe(0);
    expect(amountPaidSoFar(inst({status: 'OverduePaid'}))).toBe(100);
    expect(amountStillDue(inst({status: 'Waived'}))).toBe(0);
    expect(amountPaidSoFar(inst({status: 'Waived'}))).toBe(0);
  });

  it('finds this installment’s share of a split payment', () => {
    const repayment = {
      _id: 'r1',
      amount: 150,
      paymentDate: '',
      paymentMethod: 'Cash',
      status: 'Pending',
      scheduleAllocations: [
        {schedule: 'a', amount: 100},
        {schedule: {_id: 'b'}, amount: 50},
      ],
    } as Repayment;
    expect(allocationFor(repayment, 'b')).toBe(50);
    expect(allocationFor({...repayment, scheduleAllocations: []}, 'b')).toBe(150);
  });

  it('names the collector, or Admin when an admin recorded it', () => {
    expect(collectorName({collectedBy: null}, 'Admin')).toBe('Admin');
    expect(collectorName({collectedBy: {_id: 'e', fname: 'Meena', lname: 'S.'}}, 'Admin')).toBe('Meena S.');
  });

  it('reads the penalty only when one is applied', () => {
    expect(penaltyAmount({penaltyApplied: true, penalty: {_id: 'p', amount: 30}})).toBe(30);
    expect(penaltyAmount({penaltyApplied: false, penalty: {_id: 'p', amount: 30}})).toBeNull();
  });
});

describe('groupRuns', () => {
  it('collapses consecutive installments with the same status', () => {
    const items = [
      inst({status: 'Paid', loanInstallmentNumber: 1}),
      inst({status: 'Paid', loanInstallmentNumber: 2}),
      inst({status: 'PartiallyPaid', loanInstallmentNumber: 3}),
      inst({status: 'Overdue', loanInstallmentNumber: 4}),
      inst({status: 'Overdue', loanInstallmentNumber: 5}),
      inst({status: 'Pending', loanInstallmentNumber: 6}),
      inst({status: 'Paid', loanInstallmentNumber: 7}),
    ];
    const runs = groupRuns(items);
    expect(runs.map(r => [r.status, r.items.length])).toEqual([
      ['Paid', 2],
      ['PartiallyPaid', 1],
      ['Overdue', 2],
      ['Pending', 1],
      ['Paid', 1],
    ]);
    expect(runs[2].first.loanInstallmentNumber).toBe(4);
    expect(runs[2].last.loanInstallmentNumber).toBe(5);
  });
});
