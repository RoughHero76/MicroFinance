import {describe, expect, it} from '@jest/globals';
import {
  amountInWords,
  formatDate,
  formatDayMonth,
  formatMoney,
  formatMoneyInput,
  formatMoneyShort,
  groupIndian,
  parseMoney,
} from '@/lib/format';

describe('Indian grouping', () => {
  it('groups by thousand, then lakh and crore', () => {
    expect(groupIndian('999')).toBe('999');
    expect(groupIndian('1000')).toBe('1,000');
    expect(groupIndian('100000')).toBe('1,00,000');
    expect(groupIndian('1840000')).toBe('18,40,000');
    expect(groupIndian('123456789')).toBe('12,34,56,789');
  });
});

describe('formatMoney', () => {
  it('shows rupees with Indian grouping and paise only when present', () => {
    expect(formatMoney(1840000)).toBe('₹18,40,000');
    expect(formatMoney(1065)).toBe('₹1,065');
    expect(formatMoney(1065.5)).toBe('₹1,065.50');
    expect(formatMoney(0)).toBe('₹0');
    expect(formatMoney(-250)).toBe('-₹250');
    expect(formatMoney(null)).toBe('');
    expect(formatMoney(NaN)).toBe('');
  });

  it('has a short form for tight spaces', () => {
    expect(formatMoneyShort(36640)).toBe('₹36.6k');
    expect(formatMoneyShort(620000)).toBe('₹6.2L');
    expect(formatMoneyShort(40000)).toBe('₹40k');
    expect(formatMoneyShort(12000000)).toBe('₹1.2Cr');
    expect(formatMoneyShort(950)).toBe('₹950');
  });
});

describe('money input', () => {
  it('groups while typing and parses back', () => {
    expect(formatMoneyInput('25000')).toBe('25,000');
    expect(formatMoneyInput('2500000')).toBe('25,00,000');
    expect(formatMoneyInput('1065.')).toBe('1,065.');
    expect(formatMoneyInput('1065.555')).toBe('1,065.55');
    expect(formatMoneyInput('abc')).toBe('');
    expect(parseMoney('25,000')).toBe(25000);
    expect(parseMoney('1,065.50')).toBe(1065.5);
    expect(parseMoney('')).toBeNull();
  });
});

describe('dates', () => {
  const d = new Date(2026, 8, 26, 10, 24);
  it('formats in English and Hindi', () => {
    expect(formatDate(d)).toBe('26 Sep 2026');
    expect(formatDate(d, 'en', {short: true})).toBe('26 Sep');
    expect(formatDate(d, 'hi')).toBe('26 सित॰ 2026');
    expect(formatDayMonth(d)).toBe('26/09');
    expect(formatDate('not a date')).toBe('');
  });
});

describe('amountInWords', () => {
  it('reads amounts in English with Indian units', () => {
    expect(amountInWords(1065)).toBe('One thousand sixty-five rupees');
    expect(amountInWords(1)).toBe('One rupee');
    expect(amountInWords(100000)).toBe('One lakh rupees');
    expect(amountInWords(1840000)).toBe('Eighteen lakh forty thousand rupees');
    expect(amountInWords(25000000)).toBe('Two crore fifty lakh rupees');
    expect(amountInWords(1065.5)).toBe('One thousand sixty-five rupees and fifty paise');
    expect(amountInWords(0)).toBe('Zero rupees');
  });

  it('reads amounts in Hindi', () => {
    expect(amountInWords(1065, 'hi')).toBe('एक हज़ार पैंसठ रुपये');
    expect(amountInWords(1, 'hi')).toBe('एक रुपया');
    expect(amountInWords(250000, 'hi')).toBe('दो लाख पचास हज़ार रुपये');
    expect(amountInWords(399, 'hi')).toBe('तीन सौ निन्यानवे रुपये');
  });

  it('returns nothing for invalid input', () => {
    expect(amountInWords(-5)).toBe('');
    expect(amountInWords(null)).toBe('');
  });
});
