// Money, number and date formatting for English and Hindi (U-11).
// Written by hand rather than with Intl, so the output is the same on every
// Android version and engine: ₹18,40,000 grouping, "26 Sep 2026".

import type {Lang} from '@/brand/types';

/** Indian digit grouping: 1840000 → "18,40,000". */
export function groupIndian(integerDigits: string): string {
  if (integerDigits.length <= 3) {
    return integerDigits;
  }
  const last3 = integerDigits.slice(-3);
  const rest = integerDigits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null || !Number.isFinite(value)) {
    return '';
  }
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const grouped = groupIndian(int);
  return `${negative ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
}

/**
 * ₹ amount. Paise are shown only when the amount has them, so ₹1,065 stays
 * short but ₹1,065.50 isn't rounded away.
 */
export function formatMoney(
  value: number | null | undefined,
  opts: {decimals?: number; symbol?: boolean} = {},
): string {
  if (value == null || !Number.isFinite(value)) {
    return '';
  }
  const hasPaise = Math.round(value * 100) % 100 !== 0;
  const decimals = opts.decimals ?? (hasPaise ? 2 : 0);
  const text = formatNumber(value, decimals);
  return opts.symbol === false ? text : text.startsWith('-') ? `-₹${text.slice(1)}` : `₹${text}`;
}

/** Short money for tight spaces: ₹36.6k, ₹6.2L, ₹1.2Cr. */
export function formatMoneyShort(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '';
  }
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, '');
  if (abs >= 1e7) {
    return `${sign}₹${trim(abs / 1e7)}Cr`;
  }
  if (abs >= 1e5) {
    return `${sign}₹${trim(abs / 1e5)}L`;
  }
  if (abs >= 1e3) {
    return `${sign}₹${trim(abs / 1e3)}k`;
  }
  return formatMoney(value);
}

/** Parses what the user typed into a money field ("25,000.5" → 25000.5). */
export function parseMoney(text: string): number | null {
  const cleaned = text.replace(/[^\d.]/g, '');
  if (!cleaned) {
    return null;
  }
  const [int, ...rest] = cleaned.split('.');
  const normalized = rest.length ? `${int}.${rest.join('').slice(0, 2)}` : int;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Groups digits while typing: "25000" → "25,000", keeping a trailing ".". */
export function formatMoneyInput(text: string): string {
  const cleaned = text.replace(/[^\d.]/g, '');
  if (!cleaned) {
    return '';
  }
  const [int, ...rest] = cleaned.split('.');
  const intPart = groupIndian(int.replace(/^0+(?=\d)/, '') || '0');
  return rest.length ? `${intPart}.${rest.join('').slice(0, 2)}` : intPart;
}

const MONTHS: Record<Lang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जन॰', 'फ़र॰', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल॰', 'अग॰', 'सित॰', 'अक्तू॰', 'नव॰', 'दिस॰'],
};

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value == null || value === '') {
    return null;
  }
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "26 Sep 2026"; with `short`, "26 Sep". */
export function formatDate(value: DateInput, lang: Lang = 'en', opts: {short?: boolean} = {}): string {
  const d = toDate(value);
  if (!d) {
    return '';
  }
  const base = `${pad(d.getDate())} ${MONTHS[lang][d.getMonth()]}`;
  return opts.short ? base : `${base} ${d.getFullYear()}`;
}

/** "10:24" (24-hour, as on the plan's mocks). */
export function formatTime(value: DateInput): string {
  const d = toDate(value);
  if (!d) {
    return '';
  }
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(value: DateInput, lang: Lang = 'en'): string {
  const d = toDate(value);
  if (!d) {
    return '';
  }
  return `${formatDate(d, lang)}, ${formatTime(d)}`;
}

/** "30/09", used in SMS receipts. */
export function formatDayMonth(value: DateInput): string {
  const d = toDate(value);
  if (!d) {
    return '';
  }
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Date-only ISO string for the API (YYYY-MM-DD), in local time. */
export function toISODate(value: DateInput): string {
  const d = toDate(value);
  if (!d) {
    return '';
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isSameDay(a: DateInput, b: DateInput): boolean {
  const x = toDate(a);
  const y = toDate(b);
  return (
    !!x && !!y && x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
  );
}

// ---------------------------------------------------------------------------
// Amount in words (P-01), Indian numbering: thousand, lakh, crore.

const EN_ONES = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function enBelow100(n: number): string {
  if (n < 20) {
    return EN_ONES[n];
  }
  const tens = EN_TENS[Math.floor(n / 10)];
  return n % 10 ? `${tens}-${EN_ONES[n % 10]}` : tens;
}

function enBelow1000(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) {
    parts.push(`${EN_ONES[hundreds]} hundred`);
  }
  if (rest) {
    parts.push(enBelow100(rest));
  }
  return parts.join(' ');
}

// Hindi number words 0–99 are irregular, so they're listed in full.
const HI_0_99 = [
  'शून्य',
  'एक',
  'दो',
  'तीन',
  'चार',
  'पाँच',
  'छह',
  'सात',
  'आठ',
  'नौ',
  'दस',
  'ग्यारह',
  'बारह',
  'तेरह',
  'चौदह',
  'पंद्रह',
  'सोलह',
  'सत्रह',
  'अठारह',
  'उन्नीस',
  'बीस',
  'इक्कीस',
  'बाईस',
  'तेईस',
  'चौबीस',
  'पच्चीस',
  'छब्बीस',
  'सत्ताईस',
  'अट्ठाईस',
  'उनतीस',
  'तीस',
  'इकतीस',
  'बत्तीस',
  'तैंतीस',
  'चौंतीस',
  'पैंतीस',
  'छत्तीस',
  'सैंतीस',
  'अड़तीस',
  'उनतालीस',
  'चालीस',
  'इकतालीस',
  'बयालीस',
  'तैंतालीस',
  'चवालीस',
  'पैंतालीस',
  'छियालीस',
  'सैंतालीस',
  'अड़तालीस',
  'उनचास',
  'पचास',
  'इक्यावन',
  'बावन',
  'तिरेपन',
  'चौवन',
  'पचपन',
  'छप्पन',
  'सत्तावन',
  'अट्ठावन',
  'उनसठ',
  'साठ',
  'इकसठ',
  'बासठ',
  'तिरेसठ',
  'चौंसठ',
  'पैंसठ',
  'छियासठ',
  'सड़सठ',
  'अड़सठ',
  'उनहत्तर',
  'सत्तर',
  'इकहत्तर',
  'बहत्तर',
  'तिहत्तर',
  'चौहत्तर',
  'पचहत्तर',
  'छिहत्तर',
  'सतहत्तर',
  'अठहत्तर',
  'उनासी',
  'अस्सी',
  'इक्यासी',
  'बयासी',
  'तिरासी',
  'चौरासी',
  'पचासी',
  'छियासी',
  'सत्तासी',
  'अट्ठासी',
  'नवासी',
  'नब्बे',
  'इक्यानवे',
  'बानवे',
  'तिरानवे',
  'चौरानवे',
  'पचानवे',
  'छियानवे',
  'सत्तानवे',
  'अट्ठानवे',
  'निन्यानवे',
];

function hiBelow1000(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) {
    parts.push(`${HI_0_99[hundreds]} सौ`);
  }
  if (rest) {
    parts.push(HI_0_99[rest]);
  }
  return parts.join(' ');
}

function integerInWords(n: number, lang: Lang): string {
  if (n === 0) {
    return lang === 'hi' ? HI_0_99[0] : 'zero';
  }
  const below100 = lang === 'hi' ? (x: number) => HI_0_99[x] : enBelow100;
  const below1000 = lang === 'hi' ? hiBelow1000 : enBelow1000;
  const names =
    lang === 'hi'
      ? {crore: 'करोड़', lakh: 'लाख', thousand: 'हज़ार'}
      : {crore: 'crore', lakh: 'lakh', thousand: 'thousand'};

  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  // Crores can exceed 99 (e.g. 150 crore), so they reuse the full function.
  if (crore) {
    parts.push(`${crore < 100 ? below100(crore) : integerInWords(crore, lang)} ${names.crore}`);
  }
  if (lakh) {
    parts.push(`${below100(lakh)} ${names.lakh}`);
  }
  if (thousand) {
    parts.push(`${below100(thousand)} ${names.thousand}`);
  }
  if (rest) {
    parts.push(below1000(rest));
  }
  return parts.join(' ');
}

/**
 * "One thousand sixty-five rupees" / "एक हज़ार पैंसठ रुपये".
 * Paise are included when present: "… rupees and fifty paise".
 */
export function amountInWords(value: number | null | undefined, lang: Lang = 'en'): string {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return '';
  }
  const totalPaise = Math.round(value * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;

  if (lang === 'hi') {
    const r = `${integerInWords(rupees, 'hi')} ${rupees === 1 ? 'रुपया' : 'रुपये'}`;
    return paise ? `${r} और ${HI_0_99[paise]} पैसे` : r;
  }

  const words = `${integerInWords(rupees, 'en')} ${rupees === 1 ? 'rupee' : 'rupees'}`;
  const full = paise ? `${words} and ${enBelow100(paise)} paise` : words;
  return full.charAt(0).toUpperCase() + full.slice(1);
}
