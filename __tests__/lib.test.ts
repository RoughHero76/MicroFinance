import {describe, expect, it} from '@jest/globals';
import {brand} from '@/brand';
import {can} from '@/lib/can';
import {leadDisplayStatus, normalizeLoanType, statusTone} from '@/lib/enums';
import {normalizePhone} from '@/lib/messaging';
import {buildPenaltyNotice, buildReceipt, installmentLabel, receiptRef} from '@/lib/receipt';
import en from '@/i18n/en.json';
import hi from '@/i18n/hi.json';

function keysOf(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('translations', () => {
  it('Hindi has every English key and nothing extra', () => {
    expect(keysOf(hi).sort()).toEqual(keysOf(en).sort());
  });
});

describe('receipts', () => {
  const data = {
    amount: 1065,
    method: 'Cash',
    loanNo: 1039,
    installments: [11],
    date: new Date(2026, 8, 30, 10, 24),
    balance: 35575,
    repaymentId: '66f1a2b3c4d5e6f7a8r7f3k2',
  };

  it('builds a one-part English SMS', () => {
    const sms = buildReceipt(brand, 'sms', 'en', data);
    expect(sms).toBe('EviFinance: Rs1,065 recd for loan #1039 on 30/09 (Cash). Bal Rs35,575. Ref R7F3K2');
    expect(sms.length).toBeLessThanOrEqual(160);
  });

  it('builds a one-part Hindi SMS (Unicode limit 70)', () => {
    const sms = buildReceipt(brand, 'sms', 'hi', data);
    expect(sms).toContain('₹1,065');
    expect(sms.length).toBeLessThanOrEqual(70);
  });

  it('builds the WhatsApp receipt with an installment range for split payments', () => {
    const text = buildReceipt(brand, 'whatsapp', 'en', {...data, installments: [11, 10]});
    expect(text).toContain('Loan #1039 · Installment 10–11');
    expect(text.split('\n')).toHaveLength(6);
  });

  it('drops the installment part when there is none', () => {
    const text = buildReceipt(brand, 'whatsapp', 'en', {...data, installments: []});
    expect(text).toContain('Loan #1039\n');
  });

  it('builds the penalty notice', () => {
    const text = buildPenaltyNotice(brand, 'en', {amount: 300, loanNo: 1039, date: new Date(2026, 8, 30)});
    expect(text).toBe('EviFinance: Late fee Rs300 on loan #1039 (30/09). Pay with next installment.');
  });

  it('refs and ranges', () => {
    expect(receiptRef('abcdef123456')).toBe('123456');
    expect(installmentLabel([3])).toBe('3');
    expect(installmentLabel([])).toBe('');
  });
});

describe('permissions', () => {
  const admin = {role: 'admin' as const};
  const employee = {role: 'employee' as const};

  it('gives admins management and employees field work', () => {
    expect(can(admin, 'loan.close')).toBe(true);
    expect(can(employee, 'loan.close')).toBe(false);
    expect(can(employee, 'lead.create')).toBe(true);
    expect(can(admin, 'lead.create')).toBe(false);
  });

  it('lets both roles record payments (BE-10)', () => {
    expect(can(admin, 'payment.record')).toBe(true);
    expect(can(employee, 'payment.record')).toBe(true);
  });

  it('hides actions of a switched-off module (M-11)', () => {
    expect(can(employee, 'lead.create', {leads: false})).toBe(false);
    expect(can(null, 'payment.record')).toBe(false);
  });
});

describe('enums', () => {
  it('maps statuses to one tone everywhere', () => {
    expect(statusTone('repayment', 'Approved')).toBe('success');
    expect(statusTone('schedule', 'Overdue')).toBe('danger');
    expect(statusTone('loan', 'unknown')).toBe('neutral');
  });

  it('normalises loan types and lead status', () => {
    expect(normalizeLoanType('Gold Loan')).toBe('Gold');
    expect(normalizeLoanType('x')).toBeNull();
    expect(leadDisplayStatus({status: 'Approved', isLeadConverted: true})).toBe('Converted');
  });

  it('normalises phone numbers', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
  });
});
