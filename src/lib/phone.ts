// Phone number helpers shared by the phone and web contact actions.

/** Digits only, without a leading +91/0 for 10-digit Indian numbers. */
export function normalizePhone(phone: string | null | undefined): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/** WhatsApp needs the country code. */
export function whatsappNumber(phone: string): string {
  const n = normalizePhone(phone);
  return n.length === 10 ? `91${n}` : n;
}
