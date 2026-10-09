// Contact actions on the web. Phone browsers hand off to the dialler and
// SMS app; on a computer there is none, so the number is copied instead.
// WhatsApp opens WhatsApp Web with the message filled in.

import i18n from '@/i18n';
import {toast} from '@/ui/Toast';
import {normalizePhone, whatsappNumber} from './phone';

export {normalizePhone};

const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(i18n.t('common.copiedValue', {value: text}));
    return true;
  } catch {
    return false;
  }
}

function openTab(url: string): boolean {
  return !!window.open(url, '_blank', 'noopener');
}

export async function callPhone(phone: string): Promise<boolean> {
  const number = normalizePhone(phone);
  if (isTouch()) {
    window.location.href = `tel:${number}`;
    return true;
  }
  return copy(number);
}

export async function openSms(phone: string, body?: string): Promise<boolean> {
  const number = normalizePhone(phone);
  if (isTouch()) {
    window.location.href = `sms:${number}${body ? `?body=${encodeURIComponent(body)}` : ''}`;
    return true;
  }
  return copy(body ? `${number}\n${body}` : number);
}

export async function openWhatsApp(phone: string, text?: string): Promise<boolean> {
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return openTab(`https://wa.me/${whatsappNumber(phone)}${query}`);
}

export async function openEmail(email: string): Promise<boolean> {
  window.location.href = `mailto:${email}`;
  return true;
}

export async function openMaps(address: string): Promise<boolean> {
  return openTab(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
}

export async function openUrl(url: string): Promise<boolean> {
  return openTab(url);
}
