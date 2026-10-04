// Receipt text for SMS and WhatsApp (E11), from the brand's templates.
// SMS stays within one part: "Rs" instead of ₹ in English keeps it GSM-7.

import type {Brand, Lang} from '@/brand/types';
import {formatDateTime, formatDayMonth, formatNumber} from './format';

export interface ReceiptData {
  amount: number;
  method: string;
  loanNo: string | number;
  /** Installment numbers this payment covered (from scheduleAllocations). */
  installments?: number[];
  date: Date | string;
  balance?: number | null;
  /** The repayment's _id; the ref is its last 6 characters in capitals. */
  repaymentId: string;
  collector?: string;
  name?: string;
}

export type ReceiptChannel = 'sms' | 'whatsapp';

export function receiptRef(repaymentId: string): string {
  return repaymentId.slice(-6).toUpperCase();
}

/** "11", or "10–11" when a payment spans installments. */
export function installmentLabel(installments: number[] | undefined): string {
  const list = [...new Set(installments ?? [])].filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  if (!list.length) {
    return '';
  }
  return list.length === 1 ? String(list[0]) : `${list[0]}–${list[list.length - 1]}`;
}

export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match));
}

// The brand name is short on purpose; long names fall back to shortName so
// the SMS still fits in one part.
function brandLabel(brand: Brand, channel: ReceiptChannel) {
  return channel === 'sms' && brand.name.length > 12 ? brand.shortName : brand.name;
}

export function buildReceipt(brand: Brand, channel: ReceiptChannel, lang: Lang, data: ReceiptData): string {
  const template = brand.receipt[channel][lang] || brand.receipt[channel].en;
  const values: Record<string, string> = {
    brand: brandLabel(brand, channel),
    name: data.name ?? '',
    amount: formatNumber(data.amount, data.amount % 1 ? 2 : 0),
    method: data.method,
    loanNo: String(data.loanNo),
    inst: installmentLabel(data.installments),
    date: formatDayMonth(data.date),
    datetime: formatDateTime(data.date, lang),
    balance: data.balance == null ? '-' : formatNumber(data.balance, data.balance % 1 ? 2 : 0),
    collector: data.collector ?? '',
    ref: receiptRef(data.repaymentId),
  };
  const text = fillTemplate(template, values);
  // No installment numbers (e.g. money went to the advance balance): drop
  // the empty "· Installment" part rather than printing it blank.
  return values.inst ? text : text.replace(/ · (Installment|किस्त)[ \t]*(?=\n|$)/gm, '');
}

export function buildPenaltyNotice(
  brand: Brand,
  lang: Lang,
  data: {amount: number; loanNo: string | number; date: Date | string},
) {
  const template = brand.receipt.penalty[lang] || brand.receipt.penalty.en;
  return fillTemplate(template, {
    brand: brandLabel(brand, 'sms'),
    amount: formatNumber(data.amount, data.amount % 1 ? 2 : 0),
    loanNo: String(data.loanNo),
    date: formatDayMonth(data.date),
  });
}
